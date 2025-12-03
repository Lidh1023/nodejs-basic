# MemorySaver 知识点详解

> MemorySaver 是 LangGraph 提供的**内存检查点器（Checkpointer）**，用于让你的 AI 应用"记住"之前的对话内容。它是构建多轮对话机器人、有状态 Agent 的核心组件。

## 📚 目录

1. [什么是 MemorySaver](#1-什么是-memorysaver)
2. [为什么需要记忆功能](#2-为什么需要记忆功能)
3. [核心概念详解](#3-核心概念详解)
4. [MemorySaver 使用方法](#4-memorysaver-使用方法)
5. [thread_id 线程标识](#5-thread_id-线程标识)
6. [实战：多轮对话机器人](#6-实战多轮对话机器人)
7. [实战：带记忆的 Agent](#7-实战带记忆的-agent)
8. [状态查看与调试](#8-状态查看与调试)
9. [注意事项与最佳实践](#9-注意事项与最佳实践)
10. [其他 Checkpointer 类型](#10-其他-checkpointer-类型)
11. [常见问题解答](#11-常见问题解答)

---

## 1. 什么是 MemorySaver

### 1.1 简单定义

**MemorySaver = 让 AI 记住对话历史的工具**

想象一下，你和朋友聊天：

- ❌ 没有 MemorySaver：每句话 AI 都当作新对话，完全不记得之前说了什么
- ✅ 有 MemorySaver：AI 能记住你说过的每一句话，像真人一样连贯对话

### 1.2 形象比喻

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   📝 MemorySaver 就像一本「对话日记」                             │
│                                                                 │
│   ┌───────────────────────────────────────────────────────┐    │
│   │  对话日记 (thread_id: "user_001")                      │    │
│   │  ─────────────────────────────────────────────────    │    │
│   │  [轮次 1] 用户: 你好，我叫小明                          │    │
│   │          AI:   你好小明！有什么可以帮你的？              │    │
│   │  ─────────────────────────────────────────────────    │    │
│   │  [轮次 2] 用户: 我喜欢编程                              │    │
│   │          AI:   编程很棒！小明，你主要用什么语言呢？       │    │
│   │  ─────────────────────────────────────────────────    │    │
│   │  [轮次 3] 用户: 我叫什么名字？                          │    │
│   │          AI:   你叫小明呀！（因为我记得！）              │    │
│   └───────────────────────────────────────────────────────┘    │
│                                                                 │
│   📌 关键点：AI 能回忆起之前说的"小明"和"喜欢编程"              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 技术定义

MemorySaver 是一个 **Checkpointer（检查点器）**：

- **检查点**：工作流执行过程中某个时刻的完整状态快照
- **Checkpointer**：负责保存和读取这些快照的工具
- **MemorySaver**：将快照存储在内存中的 Checkpointer 实现

---

## 2. 为什么需要记忆功能

### 2.1 没有记忆的问题

```javascript
// ❌ 没有记忆的对话（每次都是全新的）

// 第一次对话
await app.invoke({ messages: [new HumanMessage("我叫小明")] });
// AI: "你好小明！"

// 第二次对话（AI 完全不记得！）
await app.invoke({ messages: [new HumanMessage("我叫什么名字？")] });
// AI: "抱歉，我不知道你的名字，你还没告诉我呢"  ← 尴尬！
```

### 2.2 有记忆后的效果

```javascript
// ✅ 有记忆的对话（连贯自然）

// 第一次对话
await app.invoke(
  { messages: [new HumanMessage("我叫小明")] },
  { configurable: { thread_id: "user_001" } }
);
// AI: "你好小明！"

// 第二次对话（同一个 thread_id，AI 记得！）
await app.invoke(
  { messages: [new HumanMessage("我叫什么名字？")] },
  { configurable: { thread_id: "user_001" } }
);
// AI: "你叫小明呀！"  ← 完美！
```

### 2.3 记忆功能的应用场景

| 场景           | 描述               | 为什么需要记忆                     |
| -------------- | ------------------ | ---------------------------------- |
| **客服机器人** | 处理用户问题       | 记住用户身份、之前的问题、处理进度 |
| **个人助理**   | 日程管理、任务跟踪 | 记住用户偏好、待办事项、上下文     |
| **教育辅导**   | 一对一教学         | 记住学习进度、薄弱点、学习风格     |
| **游戏 NPC**   | 交互式对话         | 记住剧情进展、玩家选择、关系状态   |
| **心理咨询**   | 陪伴对话           | 记住用户情况、历史对话、情绪变化   |

---

## 3. 核心概念详解

### 3.1 概念关系图

```
┌─────────────────────────────────────────────────────────────────┐
│                      LangGraph 记忆系统                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────┐      ┌─────────────────┐                 │
│   │   StateGraph    │──────│   Checkpointer  │                 │
│   │   (状态图)       │      │   (检查点器)     │                 │
│   └────────┬────────┘      └────────┬────────┘                 │
│            │                        │                          │
│            │  compile({ checkpointer })                        │
│            ▼                        ▼                          │
│   ┌─────────────────────────────────────────────┐              │
│   │           Compiled App (编译后的应用)         │              │
│   │                                             │              │
│   │   invoke(input, { configurable: {           │              │
│   │     thread_id: "xxx"  ← 对话线程标识         │              │
│   │   }})                                       │              │
│   └───────────────────────┬─────────────────────┘              │
│                           │                                    │
│                           ▼                                    │
│   ┌─────────────────────────────────────────────┐              │
│   │              Memory Storage                 │              │
│   │   ┌─────────┐  ┌─────────┐  ┌─────────┐    │              │
│   │   │thread_1 │  │thread_2 │  │thread_3 │    │              │
│   │   │ 对话历史 │  │ 对话历史 │  │ 对话历史 │    │              │
│   │   └─────────┘  └─────────┘  └─────────┘    │              │
│   └─────────────────────────────────────────────┘              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 核心术语解释

#### 🔹 Checkpointer（检查点器）

**通俗解释**：就像游戏里的「存档功能」

- 游戏存档：保存游戏进度，下次可以继续玩
- Checkpointer：保存对话状态，下次可以继续聊

```
游戏存档                          LangGraph Checkpointer
─────────                        ─────────────────────
存档位置: 第3关Boss前              存档位置: 第5轮对话后
角色等级: 50级                     消息历史: [msg1, msg2, ...]
背包物品: [剑, 盾, 药水]           状态数据: { topic: "编程", ... }
```

#### 🔹 MemorySaver

**通俗解释**：将存档保存在「内存」里的存档器

- 优点：速度快、使用简单
- 缺点：程序关闭后存档丢失（就像没有插记忆卡的游戏机）

```javascript
import { MemorySaver } from "@langchain/langgraph";

const memory = new MemorySaver(); // 创建一个"内存存档器"
```

#### 🔹 thread_id（线程标识）

**通俗解释**：每个用户/对话的「专属房间号」

- 不同的 thread_id = 不同的对话记录
- 相同的 thread_id = 继续之前的对话

```javascript
// 用户 A 的对话（房间号: "user_a"）
await app.invoke(input, { configurable: { thread_id: "user_a" } });

// 用户 B 的对话（房间号: "user_b"）
await app.invoke(input, { configurable: { thread_id: "user_b" } });

// 用户 A 继续对话（还是房间号: "user_a"，能记得之前的内容）
await app.invoke(input, { configurable: { thread_id: "user_a" } });
```

#### 🔹 Checkpoint（检查点/快照）

**通俗解释**：某一时刻的「完整存档」

一个 Checkpoint 包含：

- 当前的 State（状态数据）
- 执行到了哪个节点
- 时间戳等元数据

```
Checkpoint 结构：
{
  "v": 1,                           // 版本号
  "id": "xxx",                      // 检查点 ID
  "ts": "2024-01-01T12:00:00Z",    // 时间戳
  "channel_values": {               // 状态值
    "messages": [消息1, 消息2, ...],
    "其他字段": "..."
  }
}
```

---

## 4. MemorySaver 使用方法

### 4.1 基本使用步骤

```javascript
import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph"; // 1️⃣ 导入

// 2️⃣ 创建 MemorySaver 实例
const memory = new MemorySaver();

// 3️⃣ 定义状态
const ChatState = Annotation.Root({
  messages: Annotation({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
});

// 4️⃣ 构建图
const graph = new StateGraph(ChatState)
  .addNode("chat", chatNode)
  .addEdge(START, "chat")
  .addEdge("chat", END);

// 5️⃣ 编译时传入 checkpointer
const app = graph.compile({
  checkpointer: memory, // 关键！添加记忆功能
});

// 6️⃣ 调用时指定 thread_id
const result = await app.invoke(
  { messages: [new HumanMessage("你好")] },
  { configurable: { thread_id: "my_thread_123" } } // 关键！指定对话线程
);
```

### 4.2 代码详解

#### 步骤 1-2：导入和创建 MemorySaver

```javascript
import { MemorySaver } from "@langchain/langgraph";

const memory = new MemorySaver();
```

| 代码                     | 解释                             |
| ------------------------ | -------------------------------- |
| `import { MemorySaver }` | 从 LangGraph 导入 MemorySaver 类 |
| `new MemorySaver()`      | 创建一个新的内存存储实例         |

#### 步骤 5：编译时传入 checkpointer

```javascript
const app = graph.compile({
  checkpointer: memory,
});
```

| 代码                     | 解释                           |
| ------------------------ | ------------------------------ |
| `graph.compile({ ... })` | 编译状态图为可执行应用         |
| `checkpointer: memory`   | 告诉应用使用 memory 来保存状态 |

> 💡 **关键理解**：`compile()` 不传 `checkpointer` 时，应用没有记忆功能；传了才有！

#### 步骤 6：调用时指定 thread_id

```javascript
const result = await app.invoke(
  { messages: [new HumanMessage("你好")] }, // 输入
  { configurable: { thread_id: "my_thread_123" } } // 配置
);
```

| 代码                    | 解释                 |
| ----------------------- | -------------------- |
| `invoke(input, config)` | 第二个参数是配置对象 |
| `configurable`          | 可配置选项的容器     |
| `thread_id`             | 当前对话的唯一标识   |

### 4.3 最简完整示例

```javascript
import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph";
import { ChatDeepSeek } from "@langchain/deepseek";
import { HumanMessage } from "@langchain/core/messages";
import "dotenv/config";

// 1. 创建记忆存储
const memory = new MemorySaver();

// 2. 创建 LLM
const llm = new ChatDeepSeek({ model: "deepseek-chat" });

// 3. 定义状态
const ChatState = Annotation.Root({
  messages: Annotation({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
});

// 4. 定义节点
async function chatNode(state) {
  const response = await llm.invoke(state.messages);
  return { messages: [response] };
}

// 5. 构建并编译图
const app = new StateGraph(ChatState)
  .addNode("chat", chatNode)
  .addEdge(START, "chat")
  .addEdge("chat", END)
  .compile({ checkpointer: memory }); // 添加记忆！

// 6. 多轮对话
const threadId = "conversation_001";

// 第一轮
await app.invoke(
  { messages: [new HumanMessage("我叫小明，喜欢 JavaScript")] },
  { configurable: { thread_id: threadId } }
);

// 第二轮（AI 会记得小明和 JavaScript）
const result = await app.invoke(
  { messages: [new HumanMessage("我叫什么？我喜欢什么语言？")] },
  { configurable: { thread_id: threadId } }
);

console.log(result.messages[result.messages.length - 1].content);
// 输出类似: "你叫小明，你喜欢 JavaScript！"
```

---

## 5. thread_id 线程标识

### 5.1 什么是 thread_id

**thread_id 是对话的「身份证号」**，用来区分不同的对话。

```
┌─────────────────────────────────────────────────────────────────┐
│                    thread_id 的作用                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   想象一个客服系统，同时服务多个用户：                              │
│                                                                 │
│   用户 A (thread_id: "user_a_session")                          │
│   ├── "我要退货" → AI记住                                        │
│   └── "订单号是123" → AI关联到退货请求                            │
│                                                                 │
│   用户 B (thread_id: "user_b_session")                          │
│   ├── "推荐一款手机" → AI记住                                     │
│   └── "预算3000" → AI结合推荐需求                                 │
│                                                                 │
│   两个用户的对话完全独立，互不干扰！                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 thread_id 的命名建议

```javascript
// ✅ 好的 thread_id 命名
{
  thread_id: "user_12345";
} // 用户ID
{
  thread_id: "session_abc123";
} // 会话ID
{
  thread_id: "user_12345_chat_1";
} // 用户ID + 对话序号
{
  thread_id: "order_inquiry_67890";
} // 业务类型 + ID

// ❌ 不好的 thread_id 命名
{
  thread_id: "1";
} // 太简单，容易冲突
{
  thread_id: "test";
} // 不具体
{
  thread_id: "";
} // 空字符串
```

### 5.3 多用户场景示例

```javascript
const memory = new MemorySaver();
const app = graph.compile({ checkpointer: memory });

// 用户 A 的对话
async function chatWithUserA() {
  const config = { configurable: { thread_id: "user_a" } };

  await app.invoke({ messages: [new HumanMessage("我是用户A")] }, config);
  await app.invoke({ messages: [new HumanMessage("我喜欢Python")] }, config);

  // 用户 A 的对话历史只包含用户 A 说的话
}

// 用户 B 的对话
async function chatWithUserB() {
  const config = { configurable: { thread_id: "user_b" } };

  await app.invoke({ messages: [new HumanMessage("我是用户B")] }, config);
  await app.invoke({ messages: [new HumanMessage("我喜欢Java")] }, config);

  // 用户 B 的对话历史只包含用户 B 说的话
}

// 两个用户的对话互不影响
await chatWithUserA();
await chatWithUserB();
```

### 5.4 同一用户多个对话

```javascript
// 同一用户，不同话题的对话
const userId = "user_12345";

// 话题1：技术咨询
const techConfig = { configurable: { thread_id: `${userId}_tech` } };
await app.invoke(
  { messages: [new HumanMessage("如何学 React？")] },
  techConfig
);

// 话题2：产品反馈
const feedbackConfig = { configurable: { thread_id: `${userId}_feedback` } };
await app.invoke(
  { messages: [new HumanMessage("软件有个 bug")] },
  feedbackConfig
);

// 继续技术话题（记得之前聊了 React）
await app.invoke(
  { messages: [new HumanMessage("React 的 Hooks 怎么用？")] },
  techConfig
);
```

---

## 6. 实战：多轮对话机器人

### 6.1 需求分析

构建一个能够：

1. 记住用户名字
2. 记住对话历史
3. 基于上下文回答问题

### 6.2 完整代码

```javascript
import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph";
import { ChatDeepSeek } from "@langchain/deepseek";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
} from "@langchain/core/messages";
import "dotenv/config";

// 1. 创建组件
const memory = new MemorySaver();
const llm = new ChatDeepSeek({ model: "deepseek-chat", temperature: 0.7 });

// 2. 定义状态
const ChatbotState = Annotation.Root({
  messages: Annotation({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
});

// 3. 定义聊天节点
async function chatNode(state) {
  // 添加系统提示（让 AI 知道要记住上下文）
  const systemPrompt = new SystemMessage(
    "你是一个友好的助手。请记住用户在对话中提到的信息（如名字、偏好等），" +
      "并在后续对话中自然地使用这些信息。保持对话连贯性。"
  );

  // 组合消息：系统提示 + 历史消息
  const messagesWithSystem = [systemPrompt, ...state.messages];

  const response = await llm.invoke(messagesWithSystem);
  return { messages: [response] };
}

// 4. 构建图
const chatbot = new StateGraph(ChatbotState)
  .addNode("chat", chatNode)
  .addEdge(START, "chat")
  .addEdge("chat", END)
  .compile({ checkpointer: memory });

// 5. 对话函数
async function chat(threadId, userMessage) {
  const config = { configurable: { thread_id: threadId } };

  const result = await chatbot.invoke(
    { messages: [new HumanMessage(userMessage)] },
    config
  );

  // 获取最后一条 AI 回复
  const aiResponse = result.messages[result.messages.length - 1];
  return aiResponse.content;
}

// 6. 测试多轮对话
async function main() {
  const threadId = "demo_conversation";

  console.log("🤖 开始多轮对话演示\n");
  console.log("=".repeat(50));

  // 第一轮
  console.log("👤 用户: 你好，我叫小明");
  let response = await chat(threadId, "你好，我叫小明");
  console.log(`🤖 AI: ${response}\n`);

  // 第二轮
  console.log("👤 用户: 我喜欢编程，特别是 JavaScript");
  response = await chat(threadId, "我喜欢编程，特别是 JavaScript");
  console.log(`🤖 AI: ${response}\n`);

  // 第三轮（测试记忆）
  console.log("👤 用户: 我叫什么名字？我喜欢什么？");
  response = await chat(threadId, "我叫什么名字？我喜欢什么？");
  console.log(`🤖 AI: ${response}\n`);

  console.log("=".repeat(50));
  console.log("✅ 演示完成！AI 成功记住了用户信息！");
}

main();
```

### 6.3 执行效果

```
🤖 开始多轮对话演示

==================================================
👤 用户: 你好，我叫小明
🤖 AI: 你好小明！很高兴认识你，有什么可以帮你的吗？

👤 用户: 我喜欢编程，特别是 JavaScript
🤖 AI: 太棒了小明！JavaScript 是个很好的选择，
      你是做前端开发还是全栈开发呢？

👤 用户: 我叫什么名字？我喜欢什么？
🤖 AI: 你叫小明，你喜欢编程，特别是 JavaScript！

==================================================
✅ 演示完成！AI 成功记住了用户信息！
```

---

## 7. 实战：带记忆的 Agent

### 7.1 需求分析

构建一个能够：

1. 记住对话历史
2. 使用工具（计算器、天气查询）
3. 多轮交互完成复杂任务

### 7.2 核心代码结构

```javascript
import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatDeepSeek } from "@langchain/deepseek";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { HumanMessage } from "@langchain/core/messages";
import { z } from "zod";
import "dotenv/config";

// 1. 创建记忆存储
const memory = new MemorySaver();

// 2. 定义工具
const tools = [
  new DynamicStructuredTool({
    name: "calculator",
    description: "数学计算",
    schema: z.object({ expression: z.string() }),
    func: async ({ expression }) => {
      return String(eval(expression)); // 注意：生产环境需要安全处理
    },
  }),
  // ... 其他工具
];

// 3. 绑定工具到 LLM
const llm = new ChatDeepSeek({ model: "deepseek-chat", temperature: 0 });
const llmWithTools = llm.bindTools(tools);

// 4. 定义状态
const AgentState = Annotation.Root({
  messages: Annotation({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
});

// 5. 定义节点
async function agentNode(state) {
  const response = await llmWithTools.invoke(state.messages);
  return { messages: [response] };
}

const toolNode = new ToolNode(tools);

// 6. 路由函数
function shouldCallTools(state) {
  const lastMessage = state.messages[state.messages.length - 1];
  return lastMessage.tool_calls?.length > 0 ? "tools" : "end";
}

// 7. 构建图并添加记忆
const agent = new StateGraph(AgentState)
  .addNode("agent", agentNode)
  .addNode("tools", toolNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldCallTools, {
    tools: "tools",
    end: END,
  })
  .addEdge("tools", "agent")
  .compile({ checkpointer: memory }); // 关键：添加记忆！

// 8. 使用
const config = { configurable: { thread_id: "agent_session_1" } };

// 第一轮：问天气
await agent.invoke(
  { messages: [new HumanMessage("北京天气怎么样？")] },
  config
);

// 第二轮：基于上下文继续（记得问过天气）
await agent.invoke({ messages: [new HumanMessage("比昨天热吗？")] }, config);
```

### 7.3 记忆在 Agent 中的作用

```
┌─────────────────────────────────────────────────────────────────┐
│                 带记忆的 Agent 执行流程                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  第一轮对话 (thread_id: "session_1")                            │
│  ──────────────────────────────────────                         │
│  用户: "帮我计算 100 * 5"                                        │
│    ↓                                                            │
│  Agent 决定调用 calculator                                       │
│    ↓                                                            │
│  Tool 返回: "500"                                                │
│    ↓                                                            │
│  AI 回复: "100 × 5 = 500"                                        │
│    ↓                                                            │
│  💾 保存到 memory（包含完整对话）                                 │
│                                                                 │
│  第二轮对话 (同一个 thread_id)                                    │
│  ──────────────────────────────────────                         │
│  用户: "再乘以 2"                                                 │
│    ↓                                                            │
│  📖 从 memory 读取历史（知道上次算了 500）                        │
│    ↓                                                            │
│  Agent 理解上下文，调用 calculator("500 * 2")                    │
│    ↓                                                            │
│  AI 回复: "500 × 2 = 1000"                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. 状态查看与调试

### 8.1 获取当前状态

```javascript
// 使用 getState 方法查看当前状态
const state = await app.getState({ configurable: { thread_id: "my_thread" } });

console.log("当前状态:", state.values);
console.log("消息数量:", state.values.messages.length);
```

### 8.2 获取状态历史

```javascript
// 获取所有历史状态（检查点）
const history = app.getStateHistory({
  configurable: { thread_id: "my_thread" },
});

for await (const checkpoint of history) {
  console.log("时间:", checkpoint.createdAt);
  console.log("消息数:", checkpoint.values.messages.length);
  console.log("---");
}
```

### 8.3 调试技巧

```javascript
// 打印每一轮的状态
async function chatWithDebug(threadId, message) {
  const config = { configurable: { thread_id: threadId } };

  // 调用前的状态
  const beforeState = await app.getState(config);
  console.log("调用前消息数:", beforeState.values?.messages?.length || 0);

  // 执行对话
  const result = await app.invoke(
    { messages: [new HumanMessage(message)] },
    config
  );

  // 调用后的状态
  const afterState = await app.getState(config);
  console.log("调用后消息数:", afterState.values.messages.length);

  return result;
}
```

---

## 9. 注意事项与最佳实践

### 9.1 MemorySaver 的局限性

| 特性         | 说明                      | 影响                     |
| ------------ | ------------------------- | ------------------------ |
| **内存存储** | 数据存在进程内存中        | 程序重启后数据丢失       |
| **单进程**   | 不支持多进程/多服务器共享 | 不适合分布式部署         |
| **无持久化** | 没有落盘机制              | 适合开发测试，不适合生产 |

### 9.2 适用场景

```
✅ 适合使用 MemorySaver:
   - 本地开发和测试
   - 单次运行的脚本
   - 演示和原型验证
   - 短期对话（不需要长期保存）

❌ 不适合使用 MemorySaver:
   - 生产环境（需要持久化）
   - 多实例部署
   - 需要长期保存对话历史
   - 高可用要求的系统
```

### 9.3 最佳实践

#### 1. 始终指定 thread_id

```javascript
// ✅ 好的做法
await app.invoke(input, { configurable: { thread_id: generateUUID() } });

// ❌ 坏的做法（可能导致不同用户共享对话）
await app.invoke(input, { configurable: { thread_id: "default" } });
```

#### 2. 消息状态使用累加 reducer

```javascript
// ✅ 正确：使用累加 reducer
messages: Annotation({
  reducer: (prev, next) => [...prev, ...next],  // 累加
  default: () => [],
}),

// ❌ 错误：使用替换 reducer（会丢失历史）
messages: Annotation({
  reducer: (prev, next) => next,  // 替换
  default: () => [],
}),
```

#### 3. 限制消息历史长度

```javascript
// 当消息过多时，可能超出 LLM 上下文限制
// 解决方案：在节点中裁剪历史
async function chatNode(state) {
  // 只保留最近 20 条消息
  const recentMessages = state.messages.slice(-20);

  const response = await llm.invoke(recentMessages);
  return { messages: [response] };
}
```

#### 4. 生产环境使用持久化存储

```javascript
// 开发环境
import { MemorySaver } from "@langchain/langgraph";
const checkpointer = new MemorySaver();

// 生产环境（示例，需要安装对应包）
// import { SqliteSaver } from "@langchain/langgraph-checkpoint-sqlite";
// const checkpointer = new SqliteSaver("./chat_history.db");
```

---

## 10. 其他 Checkpointer 类型

### 10.1 常见 Checkpointer 对比

| 类型              | 存储位置    | 持久化 | 适用场景   |
| ----------------- | ----------- | ------ | ---------- |
| **MemorySaver**   | 内存        | ❌     | 开发测试   |
| **SqliteSaver**   | SQLite 文件 | ✅     | 本地应用   |
| **PostgresSaver** | PostgreSQL  | ✅     | 生产环境   |
| **RedisSaver**    | Redis       | ✅     | 高性能场景 |
| **MongoSaver**    | MongoDB     | ✅     | 文档型存储 |

### 10.2 选择建议

```
开发阶段
  └── MemorySaver（简单快速）

测试阶段
  └── SqliteSaver（可以持久化，便于调试）

生产阶段
  ├── PostgresSaver（关系型，事务支持好）
  ├── RedisSaver（高性能，适合高并发）
  └── MongoSaver（灵活的文档结构）
```

---

## 11. 常见问题解答

### Q1: 为什么 AI 没有记住我说的话？

**可能原因：**

1. **没有添加 checkpointer**

```javascript
// ❌ 忘记添加 checkpointer
const app = graph.compile();

// ✅ 正确
const app = graph.compile({ checkpointer: memory });
```

2. **thread_id 不一致**

```javascript
// ❌ 每次用不同的 thread_id
await app.invoke(input, { configurable: { thread_id: "thread_1" } });
await app.invoke(input, { configurable: { thread_id: "thread_2" } }); // 新线程！

// ✅ 使用相同的 thread_id
const threadId = "my_conversation";
await app.invoke(input, { configurable: { thread_id: threadId } });
await app.invoke(input, { configurable: { thread_id: threadId } });
```

3. **消息 reducer 设置错误**

```javascript
// ❌ 使用替换 reducer
reducer: (prev, next) => next; // 每次都替换，丢失历史

// ✅ 使用累加 reducer
reducer: (prev, next) => [...prev, ...next]; // 保留历史
```

### Q2: 程序重启后记忆丢失了？

**解答**：MemorySaver 存储在内存中，程序结束后数据就没了。如需持久化，请使用 SqliteSaver 或其他持久化 Checkpointer。

### Q3: 如何清空某个线程的记忆？

```javascript
// 方法1：使用新的 thread_id 开始新对话
const newThreadId = `user_${Date.now()}`;

// 方法2：重新创建 MemorySaver（清空所有）
memory = new MemorySaver();
```

### Q4: 多个用户会共享记忆吗？

**不会**，只要使用不同的 thread_id，每个用户的对话是完全隔离的。

```javascript
// 用户 A 和用户 B 使用不同的 thread_id
const userAConfig = { configurable: { thread_id: "user_a" } };
const userBConfig = { configurable: { thread_id: "user_b" } };
// 两者的对话历史互不影响
```

---

## 🎯 快速参考

### 导入

```javascript
import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph";
```

### 完整模板

```javascript
// 1. 创建 MemorySaver
const memory = new MemorySaver();

// 2. 定义状态（注意 messages 用累加 reducer）
const State = Annotation.Root({
  messages: Annotation({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
});

// 3. 编译时传入 checkpointer
const app = graph.compile({ checkpointer: memory });

// 4. 调用时指定 thread_id
await app.invoke(input, { configurable: { thread_id: "your_thread_id" } });
```

---

## 📖 学习资源

- **官方文档**: https://langchain-ai.github.io/langgraphjs/
- **Persistence 指南**: https://langchain-ai.github.io/langgraphjs/how-tos/#persistence
- **示例代码**:
  - `src/langgraph/07-memory-basic.js`
  - `src/langgraph/08-memory-chatbot.js`
  - `src/langgraph/09-memory-agent.js`

---

> 💡 **学习建议**: 先运行 `07-memory-basic.js` 理解基本概念，然后尝试 `08-memory-chatbot.js` 构建多轮对话，最后学习 `09-memory-agent.js` 实现带记忆的 Agent。每一步都观察 AI 是如何"记住"之前对话的！
