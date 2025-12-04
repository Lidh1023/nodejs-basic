# LangChain Agent 知识点详解

> 让 AI 从「只能说」进化到「能思考、能行动」—— Agent 是 AI 应用的核心范式

[![LangChain](https://img.shields.io/badge/LangChain-v0.3-blue)](https://js.langchain.com/)
[![LangGraph](https://img.shields.io/badge/LangGraph-v0.2-green)](https://langchain-ai.github.io/langgraphjs/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)

## 📖 前言

**你是否想过这些问题？**

- 🤔 为什么 ChatGPT 只能聊天，不能帮我真正做事？
- 🤔 如何让 AI 自己决定什么时候查资料、什么时候计算？
- 🤔 AI Agent 到底是什么？和普通的 AI 对话有什么区别？

**本文将带你彻底理解 Agent 的概念！**

读完本文，你将能够：

- ✅ 理解 Agent 的本质和工作原理
- ✅ 掌握 ReAct 模式（推理 + 行动）
- ✅ 使用 LangGraph 构建自己的 Agent
- ✅ 理解 Agent 与 Tools 的协作关系

---

## 📚 目录

- [什么是 Agent？](#什么是-agent)
- [Agent vs 普通 LLM](#agent-vs-普通-llm)
- [ReAct 模式详解](#react-模式详解)
- [Agent 的核心组件](#agent-的核心组件)
- [使用 LangGraph 构建 Agent](#使用-langgraph-构建-agent)
- [Agent 的工作流程](#agent-的工作流程)
- [实战案例分析](#实战案例分析)
- [常见问题 FAQ](#常见问题-faq)
- [进阶主题](#进阶主题)
- [最佳实践](#最佳实践)

---

## 什么是 Agent？

### 🤔 一句话解释

**Agent（智能代理）是能够自主思考、决策并执行任务的 AI 系统。**

它不仅能"说"（生成文本），还能"做"（调用工具执行操作）。

### 形象比喻

想象你雇了一个助理：

| 类型         | 行为特点                                    |
| ------------ | ------------------------------------------- |
| **普通 AI**  | 只会回答问题，"天气我不知道，你自己查吧"    |
| **AI Agent** | 会主动行动，"我帮你查一下... 北京今天 15°C" |

**Agent = 有手有脚的 AI**

### Agent 的核心能力

```
┌─────────────────────────────────────────────────────────────┐
│                      Agent 的核心能力                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🧠 推理能力 (Reasoning)                                    │
│     理解用户意图，分解任务，制定计划                          │
│                                                             │
│  🔧 工具使用 (Tool Use)                                     │
│     调用外部工具：搜索、计算、API、数据库等                   │
│                                                             │
│  🔄 自主循环 (Autonomous Loop)                              │
│     思考 → 行动 → 观察 → 再思考，直到完成任务                 │
│                                                             │
│  📝 记忆能力 (Memory)                                       │
│     记住对话历史和上下文，保持连贯性                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Agent vs 普通 LLM

### 关键区别

| 对比维度     | 普通 LLM           | Agent                       |
| ------------ | ------------------ | --------------------------- |
| **能力边界** | 只能生成文本       | 可以调用工具、执行操作      |
| **信息来源** | 仅限训练数据       | 可获取实时信息（搜索、API） |
| **任务执行** | 一问一答，被动响应 | 自主规划、多步执行          |
| **决策方式** | 无                 | 根据情况自主决定下一步      |
| **复杂任务** | 难以处理           | 可分解并逐步完成            |

### 实际对比示例

**场景：用户问「帮我订一张明天去上海的机票」**

#### 普通 LLM 的回答

```
抱歉，我无法帮您订机票。您可以通过以下方式预订：
1. 访问携程、去哪儿等网站
2. 下载航空公司 App
3. 拨打航空公司客服电话
...
```

#### Agent 的行为

```
[思考] 用户想订机票，我需要：
  1. 确认出发地
  2. 搜索航班
  3. 选择合适的航班
  4. 完成预订

[行动 1] 调用 search_flights(from="北京", to="上海", date="明天")
[观察 1] 找到 15 个航班，最低价 ¥550

[行动 2] 调用 get_flight_details(flight_id="CA1234")
[观察 2] CA1234，08:00-10:30，¥680

[思考] 需要用户确认航班选择...

[回答] 我找到了 15 个航班，推荐以下选项：
  - CA1234，08:00-10:30，¥680
  - MU5678，10:00-12:30，¥550
  请问您想预订哪个？
```

---

## ReAct 模式详解

### 什么是 ReAct？

**ReAct = Reasoning + Acting（推理 + 行动）**

这是构建 Agent 最流行的范式，源自 2022 年的论文《ReAct: Synergizing Reasoning and Acting in Language Models》。

### ReAct 的核心循环

```
┌────────────────────────────────────────────────────────────┐
│                     ReAct 循环流程                          │
├────────────────────────────────────────────────────────────┤
│                                                            │
│    ┌─────────┐                                             │
│    │ Thought │ 思考：分析当前状态，决定下一步               │
│    └────┬────┘                                             │
│         │                                                  │
│         ▼                                                  │
│    ┌─────────┐                                             │
│    │ Action  │ 行动：调用工具执行操作                       │
│    └────┬────┘                                             │
│         │                                                  │
│         ▼                                                  │
│    ┌─────────────┐                                         │
│    │ Observation │ 观察：获取工具返回的结果                  │
│    └──────┬──────┘                                         │
│           │                                                │
│           ▼                                                │
│    ┌──────────────┐                                        │
│    │   再次思考    │ 是否需要继续？                          │
│    └──────┬───────┘                                        │
│           │                                                │
│     ┌─────┴─────┐                                          │
│     │           │                                          │
│     ▼           ▼                                          │
│   继续循环    生成最终答案                                   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 具体示例

**用户问：北京比上海冷多少度？**

```
[Thought 1]
用户想知道温度差，我需要：
1. 查询北京天气
2. 查询上海天气
3. 计算温度差

[Action 1]
调用 get_weather(city="北京")

[Observation 1]
{"city": "北京", "temperature": "5°C", "condition": "晴天"}

[Thought 2]
已获取北京温度 5°C，现在需要查上海

[Action 2]
调用 get_weather(city="上海")

[Observation 2]
{"city": "上海", "temperature": "12°C", "condition": "多云"}

[Thought 3]
北京 5°C，上海 12°C，需要计算差值

[Action 3]
调用 calculator(expression="12 - 5")

[Observation 3]
12 - 5 = 7

[Thought 4]
计算完成，上海比北京高 7 度，可以回答了

[Final Answer]
目前北京气温 5°C，上海气温 12°C，上海比北京高 7°C。
北京今天会比较冷，出门记得多穿衣服！
```

### 为什么 ReAct 有效？

| 优势         | 说明                                |
| ------------ | ----------------------------------- |
| **可解释性** | 每一步思考都可见，便于调试和理解    |
| **准确性**   | 通过工具获取真实数据，避免 LLM 幻觉 |
| **灵活性**   | 可根据中间结果动态调整策略          |
| **可扩展性** | 只需添加新工具即可扩展 Agent 能力   |

---

## Agent 的核心组件

### 组件架构图

```
┌─────────────────────────────────────────────────────────────┐
│                         Agent 架构                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                      🧠 LLM（大脑）                    │  │
│  │  • 理解用户意图                                        │  │
│  │  • 推理和决策                                          │  │
│  │  • 生成回答                                            │  │
│  └───────────────────────────────────────────────────────┘  │
│                             │                               │
│                             ▼                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    🔧 Tools（工具）                    │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐      │  │
│  │  │  天气   │ │  搜索   │ │  计算   │ │ 数据库  │ ...  │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘      │  │
│  └───────────────────────────────────────────────────────┘  │
│                             │                               │
│                             ▼                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    📋 State（状态）                    │  │
│  │  • messages: 对话历史                                  │  │
│  │  • 其他上下文信息                                      │  │
│  └───────────────────────────────────────────────────────┘  │
│                             │                               │
│                             ▼                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   🔄 Graph（流程图）                   │  │
│  │  定义节点之间的流转逻辑                                 │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1. LLM（大脑）

LLM 是 Agent 的核心，负责：

- **理解**：解析用户意图
- **推理**：分析问题，制定策略
- **决策**：选择合适的工具
- **生成**：产出最终回答

```javascript
import { ChatDeepSeek } from "@langchain/deepseek";

const llm = new ChatDeepSeek({
  model: "deepseek-chat",
  temperature: 0, // 工具调用建议低温度
});
```

### 2. Tools（工具）

工具是 Agent 的"双手"，扩展 Agent 的能力边界：

```javascript
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

// 示例：天气查询工具
const weatherTool = new DynamicStructuredTool({
  name: "get_weather",
  description: "获取城市天气信息。当用户询问天气时使用。",
  schema: z.object({
    city: z.string().describe("城市名称"),
  }),
  func: async ({ city }) => {
    // 调用天气 API
    return JSON.stringify({ city, temp: "15°C", condition: "晴天" });
  },
});
```

### 3. State（状态）

状态保存 Agent 的"记忆"：

```javascript
import { Annotation } from "@langchain/langgraph";

const AgentState = Annotation.Root({
  messages: Annotation({
    reducer: (prev, next) => [...prev, ...next], // 累加消息
    default: () => [],
  }),
});
```

**消息类型：**

| 类型            | 说明                             |
| --------------- | -------------------------------- |
| `HumanMessage`  | 用户发送的消息                   |
| `AIMessage`     | AI 的回复（可能包含 tool_calls） |
| `ToolMessage`   | 工具执行的结果                   |
| `SystemMessage` | 系统指令                         |

### 4. Graph（流程图）

使用 LangGraph 定义 Agent 的执行流程：

```javascript
import { StateGraph, START, END } from "@langchain/langgraph";

const graph = new StateGraph(AgentState)
  .addNode("agent", agentNode) // 思考节点
  .addNode("tools", toolNode) // 工具节点
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldCallTools, {
    tools: "tools",
    end: END,
  })
  .addEdge("tools", "agent"); // 关键：循环！
```

---

## 使用 LangGraph 构建 Agent

### 环境准备

```bash
# 安装依赖
npm install @langchain/langgraph @langchain/core @langchain/deepseek zod dotenv
```

```javascript
// .env 文件
DEEPSEEK_API_KEY = your_api_key;
```

### 完整代码示例

```javascript
/**
 * 使用 LangGraph 构建 ReAct Agent
 */
import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatDeepSeek } from "@langchain/deepseek";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { HumanMessage } from "@langchain/core/messages";
import { z } from "zod";
import "dotenv/config";

// 1. 定义工具
const tools = [
  new DynamicStructuredTool({
    name: "get_weather",
    description: "获取城市天气",
    schema: z.object({ city: z.string() }),
    func: async ({ city }) => {
      const data = { 北京: "15°C 晴", 上海: "20°C 多云" };
      return data[city] || "22°C 晴天";
    },
  }),
  new DynamicStructuredTool({
    name: "calculator",
    description: "数学计算",
    schema: z.object({ expression: z.string() }),
    func: async ({ expression }) => {
      return String(Function(`"use strict"; return (${expression})`)());
    },
  }),
];

// 2. 初始化 LLM 并绑定工具
const llm = new ChatDeepSeek({ model: "deepseek-chat", temperature: 0 });
const llmWithTools = llm.bindTools(tools);

// 3. 定义状态
const AgentState = Annotation.Root({
  messages: Annotation({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
});

// 4. 定义节点
async function agentNode(state) {
  const response = await llmWithTools.invoke(state.messages);
  return { messages: [response] };
}

const toolNode = new ToolNode(tools);

// 5. 定义路由
function shouldCallTools(state) {
  const last = state.messages[state.messages.length - 1];
  return last.tool_calls?.length > 0 ? "tools" : "end";
}

// 6. 构建图
const graph = new StateGraph(AgentState)
  .addNode("agent", agentNode)
  .addNode("tools", toolNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldCallTools, {
    tools: "tools",
    end: END,
  })
  .addEdge("tools", "agent");

// 7. 编译并使用
const agent = graph.compile();

const result = await agent.invoke({
  messages: [new HumanMessage("北京天气怎么样？")],
});

console.log(result.messages[result.messages.length - 1].content);
```

### 代码解析

#### 步骤 1-2：定义工具并绑定

```javascript
// 创建工具
const tools = [weatherTool, calculatorTool];

// 绑定到 LLM（关键！）
const llmWithTools = llm.bindTools(tools);
```

`bindTools()` 告诉 LLM 有哪些工具可用，LLM 会：

- 在需要时返回 `tool_calls`
- 包含工具名称和参数

#### 步骤 3：定义状态

```javascript
const AgentState = Annotation.Root({
  messages: Annotation({
    reducer: (prev, next) => [...prev, ...next], // 累加！
    default: () => [],
  }),
});
```

**为什么用累加模式？**

- 对话需要保留历史
- LLM 需要完整上下文
- 工具结果需要追加

#### 步骤 4：定义节点

```javascript
// Agent 节点：调用 LLM 做决策
async function agentNode(state) {
  const response = await llmWithTools.invoke(state.messages);
  return { messages: [response] };
}

// Tool 节点：执行工具（使用内置 ToolNode）
const toolNode = new ToolNode(tools);
```

`ToolNode` 自动处理：

1. 解析 `tool_calls`
2. 执行对应工具
3. 包装结果为 `ToolMessage`

#### 步骤 5：定义路由

```javascript
function shouldCallTools(state) {
  const last = state.messages[state.messages.length - 1];
  // 有 tool_calls → 去执行工具
  // 没有 → 结束
  return last.tool_calls?.length > 0 ? "tools" : "end";
}
```

#### 步骤 6：构建图

```javascript
const graph = new StateGraph(AgentState)
  .addNode("agent", agentNode)
  .addNode("tools", toolNode)
  .addEdge(START, "agent") // 入口
  .addConditionalEdges("agent", shouldCallTools, {
    tools: "tools",
    end: END,
  })
  .addEdge("tools", "agent"); // 循环回 agent！
```

**关键：`tools → agent` 形成循环！**

这让 Agent 可以多次调用工具，直到完成任务。

---

## Agent 的工作流程

### 流程图

```
                    用户输入
                       │
                       ▼
              ┌────────────────┐
              │   START        │
              └───────┬────────┘
                      │
                      ▼
              ┌────────────────┐
              │   Agent 节点   │◄──────────────┐
              │   (LLM 思考)   │               │
              └───────┬────────┘               │
                      │                        │
                      ▼                        │
              ┌────────────────┐               │
              │   路由判断     │               │
              │ 有 tool_calls? │               │
              └───────┬────────┘               │
                      │                        │
           ┌──────────┴──────────┐             │
           │ Yes                 │ No          │
           ▼                     ▼             │
    ┌────────────┐        ┌────────────┐       │
    │ Tools 节点 │        │    END     │       │
    │ (执行工具) │        │  输出结果   │       │
    └─────┬──────┘        └────────────┘       │
          │                                    │
          └────────────────────────────────────┘
                   工具结果返回
```

### 消息流转示例

以「北京天气怎么样？」为例：

```javascript
// 初始状态
messages: [
  HumanMessage("北京天气怎么样？")
]

// Agent 节点执行后
messages: [
  HumanMessage("北京天气怎么样？"),
  AIMessage({
    content: "",
    tool_calls: [{ name: "get_weather", args: { city: "北京" } }]
  })
]

// Tools 节点执行后
messages: [
  HumanMessage("北京天气怎么样？"),
  AIMessage({ tool_calls: [...] }),
  ToolMessage({ content: '{"city":"北京","temp":"15°C"}' })
]

// Agent 节点再次执行后（最终）
messages: [
  HumanMessage("北京天气怎么样？"),
  AIMessage({ tool_calls: [...] }),
  ToolMessage({ content: '...' }),
  AIMessage({ content: "北京今天天气晴朗，气温15°C，适合出行！" })
]
```

---

## 实战案例分析

### 案例 1：智能客服 Agent

**场景**：电商客服，能查询订单、处理退款

```javascript
// 订单查询工具
const orderTool = new DynamicStructuredTool({
  name: "query_order",
  description: "查询订单状态",
  schema: z.object({
    order_id: z.string().describe("订单号"),
  }),
  func: async ({ order_id }) => {
    // 调用订单系统
    return JSON.stringify({
      order_id,
      status: "已发货",
      shipping: "顺丰快递",
      expected: "明天送达",
    });
  },
});

// 退款申请工具
const refundTool = new DynamicStructuredTool({
  name: "request_refund",
  description: "申请退款",
  schema: z.object({
    order_id: z.string(),
    reason: z.string(),
  }),
  func: async ({ order_id, reason }) => {
    // 调用退款系统
    return JSON.stringify({
      refund_id: "RF" + Date.now(),
      status: "审核中",
      message: "退款申请已提交，预计1-3个工作日处理",
    });
  },
});

// 构建客服 Agent
const customerServiceAgent = new StateGraph(AgentState)
  .addNode("agent", agentNode)
  .addNode("tools", new ToolNode([orderTool, refundTool]))
  // ... 其他配置
  .compile();
```

**对话示例**：

```
用户：我的订单 12345 什么时候到？

Agent:
[思考] 用户查询订单状态，需要调用订单查询工具
[行动] query_order(order_id="12345")
[观察] {"status":"已发货","shipping":"顺丰","expected":"明天送达"}
[回答] 您的订单 12345 已经发货啦！由顺丰快递配送，预计明天送达。
       请保持手机畅通，快递小哥会提前联系您~
```

### 案例 2：数据分析 Agent

**场景**：分析销售数据，生成报告

```javascript
// 数据查询工具
const dataTool = new DynamicStructuredTool({
  name: "query_sales",
  description: "查询销售数据",
  schema: z.object({
    start_date: z.string(),
    end_date: z.string(),
    category: z.string().optional(),
  }),
  func: async ({ start_date, end_date, category }) => {
    // 查询数据库
    return JSON.stringify({
      total_sales: 156800,
      order_count: 523,
      avg_order: 300,
      top_products: ["iPhone 15", "MacBook", "AirPods"],
    });
  },
});

// 图表生成工具
const chartTool = new DynamicStructuredTool({
  name: "generate_chart",
  description: "生成数据图表",
  schema: z.object({
    chart_type: z.enum(["line", "bar", "pie"]),
    data: z.string(),
  }),
  func: async ({ chart_type, data }) => {
    return `图表已生成: ${chart_type}_chart.png`;
  },
});
```

### 案例 3：研究助手 Agent

**场景**：帮助用户搜索和总结信息

```javascript
// 搜索工具（使用 TavilySearch）
import { TavilySearch } from "@langchain/tavily";

const searchTool = new TavilySearch({ maxResults: 5 });

// 笔记工具
const noteTool = new DynamicStructuredTool({
  name: "take_note",
  description: "保存重要信息到笔记",
  schema: z.object({
    title: z.string(),
    content: z.string(),
  }),
  func: async ({ title, content }) => {
    // 保存到笔记系统
    return `笔记已保存: ${title}`;
  },
});

// 构建研究助手
const researchAgent = new StateGraph(AgentState)
  .addNode("agent", agentNode)
  .addNode("tools", new ToolNode([searchTool, noteTool]))
  // ...
  .compile();
```

---

## 常见问题 FAQ

### Q1: Agent 陷入死循环怎么办？

**问题**：Agent 不断调用工具，无法停止

**解决方案**：

```javascript
// 方法 1：限制最大迭代次数
const agent = graph.compile({
  recursionLimit: 10, // 最多 10 次循环
});

// 方法 2：在路由函数中检查
function shouldCallTools(state) {
  if (state.messages.length > 20) {
    console.log("警告：达到最大消息数，强制结束");
    return "end";
  }
  // ... 正常逻辑
}
```

### Q2: Agent 选错了工具怎么办？

**问题**：Agent 调用了不相关的工具

**解决方案**：

```javascript
// 1. 优化工具描述
const weatherTool = {
  name: "get_weather",
  // ❌ 不好的描述
  description: "查询天气",

  // ✅ 好的描述
  description:
    "获取指定城市的天气信息，包括温度、天气状况、风力等。" +
    "当用户询问天气、温度、是否下雨、是否需要带伞时使用此工具。",
};

// 2. 使用 SystemMessage 给 Agent 明确指令
const messages = [
  new SystemMessage(
    "你是一个智能助手。请仔细分析用户问题，选择最合适的工具。" +
      "如果问题不需要工具，直接回答即可。"
  ),
  new HumanMessage("用户问题..."),
];
```

### Q3: 如何调试 Agent？

```javascript
// 1. 在节点中添加日志
async function agentNode(state) {
  console.log("=== Agent 节点 ===");
  console.log("当前消息数:", state.messages.length);
  console.log("最后一条消息:", state.messages.slice(-1));

  const response = await llmWithTools.invoke(state.messages);

  console.log("LLM 返回:", response);
  console.log("tool_calls:", response.tool_calls);

  return { messages: [response] };
}

// 2. 使用 LangGraph 的流式输出查看中间状态
const stream = await agent.stream({
  messages: [new HumanMessage("问题")],
});

for await (const chunk of stream) {
  console.log("Chunk:", JSON.stringify(chunk, null, 2));
}
```

### Q4: 如何让 Agent 记住对话历史？

```javascript
// 使用 MemorySaver
import { MemorySaver } from "@langchain/langgraph";

const memory = new MemorySaver();

const agent = graph.compile({
  checkpointer: memory,
});

// 使用 thread_id 区分对话
const config = { configurable: { thread_id: "user-123" } };

await agent.invoke({ messages: [new HumanMessage("你好")] }, config);
await agent.invoke(
  { messages: [new HumanMessage("我刚才说了什么？")] },
  config
);
// Agent 会记住之前的对话
```

### Q5: Agent 返回结果太慢怎么优化？

```javascript
// 1. 使用流式输出，边生成边显示
const stream = await agent.stream({ messages: [...] });
for await (const chunk of stream) {
  // 实时显示结果
}

// 2. 减少不必要的工具
// 只绑定当前场景需要的工具

// 3. 使用更快的模型
const llm = new ChatDeepSeek({
  model: "deepseek-chat",  // 快速模型
  // model: "deepseek-reasoner",  // 推理模型，更慢但更准确
});

// 4. 并行调用工具（LangGraph 自动支持）
// 如果 AI 返回多个 tool_calls，ToolNode 会并行执行
```

---

## 进阶主题

### 1. 多 Agent 协作

```javascript
// 主 Agent 调度多个子 Agent
const researchAgent = buildResearchAgent();
const writerAgent = buildWriterAgent();
const reviewerAgent = buildReviewerAgent();

// 工作流：研究 → 写作 → 审核
const workflow = new StateGraph(State)
  .addNode("research", researchAgent)
  .addNode("write", writerAgent)
  .addNode("review", reviewerAgent)
  .addEdge(START, "research")
  .addEdge("research", "write")
  .addEdge("write", "review")
  .addEdge("review", END);
```

### 2. 人工介入（Human-in-the-Loop）

```javascript
// 在关键步骤等待人工确认
const graph = new StateGraph(AgentState)
  .addNode("agent", agentNode)
  .addNode("tools", toolNode)
  .addNode("human_review", async (state) => {
    // 等待人工确认
    console.log("请确认是否执行以下操作...");
    // 实际应用中，这里会等待用户输入
    return { messages: [new HumanMessage("已确认")] };
  })
  .addConditionalEdges(
    "agent",
    (state) => {
      // 敏感操作需要人工确认
      const last = state.messages.slice(-1)[0];
      if (isSensitiveOperation(last.tool_calls)) {
        return "human_review";
      }
      return "tools";
    },
    {
      human_review: "human_review",
      tools: "tools",
      end: END,
    }
  );
```

### 3. 错误恢复

```javascript
// 工具失败时的处理
async function toolNodeWithRetry(state) {
  const toolNode = new ToolNode(tools);

  try {
    return await toolNode.invoke(state);
  } catch (error) {
    console.log("工具调用失败，尝试重试...");

    // 返回错误信息给 Agent，让它决定下一步
    return {
      messages: [
        new ToolMessage({
          content: `工具调用失败: ${error.message}。请尝试其他方法。`,
          tool_call_id: state.messages.slice(-1)[0].tool_calls[0].id,
        }),
      ],
    };
  }
}
```

### 4. 并行工具调用

```javascript
// LangGraph 的 ToolNode 自动支持并行调用
// 当 AI 返回多个 tool_calls 时，会并行执行

// AI 返回：
{
  tool_calls: [
    { name: "get_weather", args: { city: "北京" } },
    { name: "get_weather", args: { city: "上海" } },
    { name: "get_time", args: {} },
  ];
}

// ToolNode 会并行执行这 3 个工具调用
```

---

## 最佳实践

### ✅ 1. 工具设计原则

```javascript
// ✅ 好的工具设计
const goodTool = {
  // 名称：简洁、描述性
  name: "search_products",

  // 描述：详细、包含使用场景
  description:
    "搜索商品信息。" +
    "当用户询问商品价格、库存、规格时使用。" +
    "返回商品名称、价格、库存数量。",

  // 参数：每个都有清晰的 describe
  schema: z.object({
    keyword: z.string().describe("搜索关键词，如商品名称"),
    category: z.string().optional().describe("商品类别，如'电子产品'"),
    max_results: z.number().optional().describe("最大返回数量，默认10"),
  }),

  // 返回：结构化 JSON
  func: async (params) => {
    const results = await searchProducts(params);
    return JSON.stringify(results);
  },
};
```

### ✅ 2. 控制 Agent 行为

```javascript
// 使用 SystemMessage 设定 Agent 人设和行为规范
const messages = [
  new SystemMessage(`
你是一个专业的客服助手。

规则：
1. 始终保持礼貌和专业
2. 如果不确定，请使用搜索工具查询
3. 涉及退款等敏感操作，先确认用户身份
4. 如果问题超出能力范围，建议转人工客服
  `),
  new HumanMessage(userQuestion),
];
```

### ✅ 3. 限制和兜底

```javascript
// 设置合理的限制
const agent = graph.compile({
  recursionLimit: 15, // 最大循环次数
});

// 超时处理
const result = await Promise.race([
  agent.invoke(input),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error("超时")), 30000)
  ),
]);
```

### ✅ 4. 日志和监控

```javascript
// 记录 Agent 的每一步操作
async function agentNodeWithLogging(state) {
  const startTime = Date.now();

  console.log(`[${new Date().toISOString()}] Agent 开始思考`);
  console.log(`输入消息数: ${state.messages.length}`);

  const response = await llmWithTools.invoke(state.messages);

  console.log(`耗时: ${Date.now() - startTime}ms`);
  console.log(`是否调用工具: ${response.tool_calls?.length > 0}`);

  // 可以将日志发送到监控系统
  // await sendToMonitoring({ ... });

  return { messages: [response] };
}
```

### ✅ 5. 工具分组

```javascript
// 按场景分组工具，避免工具过多
const customerServiceTools = [orderTool, refundTool, logisticsTool];
const analysisTools = [dataTool, chartTool, reportTool];
const searchTools = [webSearchTool, docSearchTool];

// 根据场景选择工具集
function getToolsForContext(context) {
  switch (context) {
    case "customer_service":
      return customerServiceTools;
    case "data_analysis":
      return analysisTools;
    default:
      return [...customerServiceTools, ...analysisTools];
  }
}
```

---

## 学习路径建议

### 📁 配套实战文件

| 文件                              | 内容             | 预计用时 |
| --------------------------------- | ---------------- | -------- |
| `src/agent.js`                    | Agent 入门 Demo  | 30 分钟  |
| `src/langgraph/06-react-agent.js` | ReAct Agent 详解 | 30 分钟  |
| `src/tools-demo.js`               | Tools 使用详解   | 20 分钟  |

### 🎯 学习路线

**阶段 1：理解概念（1 小时）**

1. ✅ 阅读本文档，理解 Agent 和 ReAct 的概念
2. ✅ 运行 `src/agent.js`，观察 Agent 的工作过程
3. ✅ 尝试修改问题，观察 Agent 的不同行为

**阶段 2：动手实践（2 小时）**

1. 🔥 添加新的工具（如翻译、数据库查询）
2. 🔥 实现一个特定场景的 Agent（如客服、助手）
3. 🔥 尝试处理复杂的多步骤任务

**阶段 3：进阶掌握（3+ 小时）**

1. 💎 学习 MemorySaver 实现对话记忆
2. 💎 实现人工介入的审核流程
3. 💎 探索多 Agent 协作

---

## 总结

### 🎯 核心要点

1. **Agent = LLM + Tools + 自主决策**

   - LLM 负责思考和推理
   - Tools 提供执行能力
   - 循环机制实现自主决策

2. **ReAct 模式是 Agent 的核心**

   - Thought → Action → Observation → Thought...
   - 循环直到完成任务

3. **LangGraph 是构建 Agent 的利器**

   - StateGraph 定义流程
   - ToolNode 自动处理工具调用
   - 条件边实现分支逻辑

4. **工具设计决定 Agent 能力**
   - 清晰的描述
   - 合理的参数
   - 稳定的返回格式

### 💡 记住这句话

> **Agent 的强大不在于它有多聪明，而在于它能用工具做多少事。**

工具越丰富、越可靠，Agent 的能力就越强。

---

## 参考资源

### 官方文档

- **LangGraph 官方文档**: https://langchain-ai.github.io/langgraphjs/
- **LangChain Tools 文档**: https://js.langchain.com/docs/concepts/tools/
- **ReAct 论文**: https://arxiv.org/abs/2210.03629

### 相关文章

- 《ReAct: Synergizing Reasoning and Acting in Language Models》
- 《Tool Learning with Foundation Models》

---

## 作者寄语

Agent 是 AI 应用的未来。理解了 Agent，你就掌握了让 AI "做事"而不仅仅是"说话"的能力。

从简单的 ReAct Agent 开始，逐步探索更复杂的场景。记住：

- **先理解原理，再堆功能**
- **从简单场景开始，逐步增加复杂度**
- **多调试、多观察 Agent 的行为**

如果你完成了本教程的所有练习，恭喜你！你已经具备了构建生产级 AI Agent 的基础能力。

**Happy Coding!** 🚀
