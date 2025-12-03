# LangGraph 知识点详解

> LangGraph 是 LangChain 团队推出的工作流编排框架，专门用于构建复杂的 AI Agent 和多步骤工作流。它提供了状态管理、流程控制、循环处理等能力，是构建生产级 AI 应用的核心工具。

## 📚 目录

1. [什么是 LangGraph](#1-什么是-langgraph)
2. [核心概念](#2-核心概念)
3. [StateGraph 详解](#3-stategraph-详解)
4. [Annotation 状态定义](#4-annotation-状态定义)
5. [节点 (Nodes)](#5-节点-nodes)
6. [边 (Edges)](#6-边-edges)
7. [条件边 (Conditional Edges)](#7-条件边-conditional-edges)
8. [循环流程](#8-循环流程)
9. [ReAct Agent 模式](#9-react-agent-模式)
10. [流式输出](#10-流式输出)
11. [最佳实践](#11-最佳实践)
12. [与 LangChain 的关系](#12-与-langchain-的关系)
13. [附录：LLM 参数配置](#13-附录llm-参数配置)

---

## 1. 什么是 LangGraph

### 1.1 定义

LangGraph 是一个用于构建**有状态、多步骤**的 AI 应用程序的框架。它将工作流建模为**图 (Graph)**，其中：

- **节点 (Nodes)** 代表执行步骤
- **边 (Edges)** 代表步骤之间的流转关系
- **状态 (State)** 在节点之间传递和更新

### 1.2 为什么需要 LangGraph

| 场景           | LangChain (Chain/Pipe) | LangGraph           |
| -------------- | ---------------------- | ------------------- |
| 简单的线性流程 | ✅ 足够                | 可以但没必要        |
| 条件分支       | ❌ 不直观              | ✅ 原生支持         |
| 循环/迭代      | ❌ 难以实现            | ✅ 原生支持         |
| 复杂 Agent     | ❌ 需要手写循环        | ✅ 声明式定义       |
| 状态管理       | ❌ 手动传递            | ✅ 自动管理         |
| 可视化调试     | ❌ 困难                | ✅ LangGraph Studio |

### 1.3 核心优势

```
1. 声明式定义：用图的方式描述工作流，清晰直观
2. 状态管理：自动处理状态的传递和更新
3. 流程控制：原生支持分支、循环、并行
4. 可观测性：支持流式输出，可以看到每一步的执行过程
5. 生态整合：与 LangChain 无缝集成
```

### 1.4 安装

```bash
npm install @langchain/langgraph
```

---

## 2. 核心概念

### 2.1 概念总览

```
┌────────────────────────────────────────────────────────────┐
│                     LangGraph 核心概念                      │
├────────────────────────────────────────────────────────────┤
│                                                            │
│   ┌─────────────────────────────────────────────────┐      │
│   │              StateGraph (状态图)                 │      │
│   │                                                 │      │
│   │   ┌─────┐    ┌─────┐    ┌─────┐    ┌─────┐     │      │
│   │   │START│───▶│Node1│───▶│Node2│───▶│ END │     │      │
│   │   └─────┘    └─────┘    └─────┘    └─────┘     │      │
│   │                  │          │                   │      │
│   │                  ▼          ▼                   │      │
│   │            ┌─────────────────────┐             │      │
│   │            │   State (状态)       │             │      │
│   │            │ { input, output, ...}│             │      │
│   │            └─────────────────────┘             │      │
│   └─────────────────────────────────────────────────┘      │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 2.2 核心组件

| 组件           | 作用         | 类比            |
| -------------- | ------------ | --------------- |
| **StateGraph** | 状态图容器   | 工作流定义      |
| **State**      | 工作流数据   | 全局变量        |
| **Annotation** | 状态结构定义 | TypeScript 接口 |
| **Node**       | 执行单元     | 函数            |
| **Edge**       | 连接关系     | 函数调用        |
| **START**      | 起始点       | main()          |
| **END**        | 结束点       | return          |

---

## 3. StateGraph 详解

### 3.1 基本结构

```javascript
import { StateGraph, Annotation, START, END } from "@langchain/langgraph";

// 1. 定义状态
const MyState = Annotation.Root({
  input: Annotation({ reducer: (_, x) => x, default: () => "" }),
  output: Annotation({ reducer: (_, x) => x, default: () => "" }),
});

// 2. 创建状态图
const graph = new StateGraph(MyState)
  .addNode("step1", step1Function) // 添加节点
  .addNode("step2", step2Function)
  .addEdge(START, "step1") // 添加边
  .addEdge("step1", "step2")
  .addEdge("step2", END);

// 3. 编译
const app = graph.compile();

// 4. 执行
const result = await app.invoke({ input: "hello" });
```

### 3.2 StateGraph API

```javascript
const graph = new StateGraph(StateAnnotation);

// 添加节点
graph.addNode(name: string, fn: (state) => Partial<State>);

// 添加无条件边
graph.addEdge(from: string, to: string);

// 添加条件边
graph.addConditionalEdges(
  from: string,
  router: (state) => string,
  mapping: { [key: string]: string }
);

// 编译
const app = graph.compile();

// 执行
await app.invoke(initialState);   // 同步执行
await app.stream(initialState);   // 流式执行
await app.batch([state1, state2]); // 批量执行
```

---

## 4. Annotation 状态定义

### 4.1 什么是 Annotation

**Annotation 是 LangGraph 中用来「定义状态结构」的工具**，类似于 TypeScript 的接口定义。

> 🎯 **一句话理解**：Annotation = 告诉 LangGraph「状态长什么样」+「状态怎么更新」

### 4.2 形象比喻

把 LangGraph 的工作流想象成一个**快递流水线**：

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   📦 Annotation = 定义「快递单」的格式                    │
│                                                         │
│   快递单上有哪些字段？                                    │
│   ┌─────────────────────────────────────┐               │
│   │ 收件人: ________                     │               │
│   │ 地址:   ________                     │               │
│   │ 物品:   ________                     │               │
│   │ 备注:   ________ (可以追加)           │               │
│   └─────────────────────────────────────┘               │
│                                                         │
│   每个站点（节点）都能看到这张单，也能修改它               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 4.3 基本语法

```javascript
import { Annotation } from "@langchain/langgraph";

const MyState = Annotation.Root({
  // 字段名: Annotation 配置
  fieldName: Annotation({
    reducer: reducerFunction, // 状态如何更新
    default: defaultFunction, // 默认值
  }),
});
```

### 4.4 两个核心配置

| 配置      | 作用             | 类比          |
| --------- | ---------------- | ------------- |
| `reducer` | 定义字段如何更新 | Redux reducer |
| `default` | 定义字段默认值   | 变量初始化    |

**default 示例**：

```javascript
default: () => ""      // 默认空字符串
default: () => []      // 默认空数组
default: () => 0       // 默认数字 0
default: () => null    // 默认 null
```

### 4.5 Reducer 类型

Reducer 决定了状态如何更新：

```javascript
// 1. 替换模式 - 新值覆盖旧值
reducer: (prev, next) => next;
// 节点返回 { name: "李四" } → state.name 变成 "李四"

// 2. 累加模式 - 适用于消息列表
reducer: (prev, next) => [...prev, ...next];
// 节点返回 { messages: [新消息] } → 追加到 messages 数组

// 3. 合并模式 - 适用于对象
reducer: (prev, next) => ({ ...prev, ...next });
// 节点返回 { config: {a: 1} } → 与原 config 合并

// 4. 数字累加模式
reducer: (prev, next) => prev + next;
// 节点返回 { count: 1 } → count 加 1

// 5. 自定义逻辑
const customReducer = (prev, next) => {
  if (next === null) return prev; // 忽略 null
  return next;
};
```

### 4.6 实际示例

```javascript
// 对话 Agent 的状态定义
const AgentState = Annotation.Root({
  // 消息列表 - 累加模式
  messages: Annotation({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),

  // 当前任务 - 替换模式
  currentTask: Annotation({
    reducer: (_, next) => next,
    default: () => "",
  }),

  // 执行次数 - 数字累加模式
  iterations: Annotation({
    reducer: (prev, next) => prev + next,
    default: () => 0,
  }),
});
```

### 4.7 为什么需要 Reducer

**问题场景**：多个节点都想更新同一个字段

```
例如：消息列表
  - 节点 A 返回: { messages: [new HumanMessage("hi")] }
  - 节点 B 返回: { messages: [new AIMessage("hello")] }

❌ 没有 Reducer：节点 B 的值覆盖节点 A，用户消息丢失！
✅ 有 Reducer：  [...prev, ...next]，两条消息都保留在数组里
```

### 4.8 概念总结

| 概念              | 作用             | 类比                   |
| ----------------- | ---------------- | ---------------------- |
| `Annotation.Root` | 定义整个状态结构 | TypeScript `interface` |
| `reducer`         | 定义字段如何更新 | Redux reducer          |
| `default`         | 定义字段默认值   | 变量初始化             |

> 💡 **简单记忆**：Annotation 就是告诉 LangGraph——"我的数据长这样，每个字段这样更新"！

---

## 5. 节点 (Nodes)

### 5.1 节点函数签名

```javascript
// 节点是一个函数，接收 state，返回部分更新
async function myNode(state) {
  // 从 state 读取数据
  const input = state.input;

  // 执行处理逻辑
  const result = await someAsyncOperation(input);

  // 返回要更新的字段（只返回需要更新的部分）
  return { output: result };
}
```

### 5.2 节点类型

按**功能**分类（更实用的分类方式）：

```javascript
// 1. 纯处理节点 - 只做数据处理，不调外部服务
//    可以是同步的，因为不需要等待
function processNode(state) {
  return { result: state.input.toUpperCase() };
}

// 2. LLM 节点 - 调用 AI 模型
//    必须异步，因为要等待 AI 响应
async function llmNode(state) {
  const response = await llm.invoke([new HumanMessage(state.question)]);
  return { answer: response.content };
}

// 3. API 节点 - 调用外部接口
//    必须异步，因为要等待网络响应
async function apiNode(state) {
  const data = await fetch("https://api.example.com/data");
  return { apiResult: await data.json() };
}

// 4. 工具节点 - 执行工具调用（使用内置 ToolNode）
//    LangGraph 提供的便捷方式，自动处理工具执行
import { ToolNode } from "@langchain/langgraph/prebuilt";
const toolNode = new ToolNode(tools);
```

> 💡 **关键理解**："同步/异步"只是技术特征，不是节点类型。凡是需要等待外部响应的（LLM、API、数据库），都必须用 `async/await`。

### 5.3 节点返回值规则

```javascript
// ✅ 正确：只返回需要更新的字段
function goodNode(state) {
  return { output: "result" }; // 只更新 output
}

// ❌ 错误：返回整个 state
function badNode(state) {
  return { ...state, output: "result" }; // 不需要展开
}

// ✅ 正确：返回空对象表示不更新任何字段
function noUpdateNode(state) {
  console.log(state);
  return {}; // 不更新状态
}
```

---

## 6. 边 (Edges)

### 6.1 什么是边

**Edge（边）= 流程图中连接节点的线 = 定义"谁执行完后，轮到谁"**

> 🎯 **一句话理解**：边就是告诉 LangGraph 执行顺序的"连接线"

### 6.2 形象理解

```
                Edge（边）
                   ↓
    ┌───────┐ ─────────── ┌───────┐ ─────────── ┌─────┐
    │ START │             │ NodeA │             │ END │
    └───────┘             └───────┘             └─────┘
         │                    │                    │
         └── 这条线 ──────────┴── 这条线 ──────────┘
             就是 Edge            就是 Edge

    意思：START 完了执行 NodeA，NodeA 完了执行 END
```

### 6.3 两种边的对比

| 类型       | 说明                   | 比喻   | 代码                       |
| ---------- | ---------------------- | ------ | -------------------------- |
| **普通边** | 无条件，A 完了一定到 B | 直线   | `addEdge("A", "B")`        |
| **条件边** | 根据状态决定去哪       | 岔路口 | `addConditionalEdges(...)` |

### 6.4 普通边语法

```javascript
// 语法：从 fromNode 到 toNode
graph.addEdge(fromNode, toNode);

// 意思就是：A 执行完后，执行 B
graph.addEdge("A", "B");

// 特殊节点
import { START, END } from "@langchain/langgraph";

graph.addEdge(START, "firstNode"); // 入口：流程从这里开始
graph.addEdge("lastNode", END); // 出口：流程到这里结束
```

### 6.5 串行连接

```javascript
// A → B → C → END
graph.addEdge(START, "A").addEdge("A", "B").addEdge("B", "C").addEdge("C", END);
```

### 6.6 流程图示例

```
简单串行流程:

    ┌───────┐     ┌───────┐     ┌───────┐     ┌─────┐
    │ START │────▶│   A   │────▶│   B   │────▶│ END │
    └───────┘     └───────┘     └───────┘     └─────┘
                     │             │
                     └─────────────┘
                      这些箭头就是 Edge
```

> 💡 **简单记忆**：Edge 就是流程图里的"箭头"，告诉程序"下一步该去哪个节点"！

### 6.7 addEdge vs pipe：概念对比

如果你学过 LangChain 的 `pipe()`，会发现 `addEdge()` 和它很像：

**两者都是定义执行顺序！**

```javascript
// LangChain pipe() - 把 Runnable 串起来
const chain = prompt.pipe(llm).pipe(parser);

// LangGraph addEdge() - 把 Node 串起来
const graph = new StateGraph(State)
  .addEdge(START, "A")
  .addEdge("A", "B")
  .addEdge("B", "C")
  .addEdge("C", END);
```

| 概念        | 框架      | 作用     | 连接的是                        |
| ----------- | --------- | -------- | ------------------------------- |
| `pipe()`    | LangChain | 串联组件 | Runnable（Prompt、LLM、Parser） |
| `addEdge()` | LangGraph | 连接节点 | Node（自定义函数）              |

**关键区别**：

| 特性     | pipe()         | addEdge()                |
| -------- | -------------- | ------------------------ |
| 流程类型 | 只能线性 A→B→C | 可以分支、循环           |
| 条件分支 | ❌ 不支持      | ✅ `addConditionalEdges` |
| 循环     | ❌ 不支持      | ✅ 边可以指回之前的节点  |
| 状态管理 | 手动传递       | 自动管理                 |

```
pipe():      A ──→ B ──→ C ──→ 结束（只能往前）

addEdge():   A ──→ B ──→ C ──→ 结束
                   ↑     │
                   └─────┘  （可以循环回去！）
```

> 💡 **一句话总结**：`pipe()` 是 `addEdge()` 的"简化版"——简单线性流程用 pipe，需要分支/循环用 LangGraph！

---

## 7. 条件边 (Conditional Edges)

### 7.1 基本语法

```javascript
graph.addConditionalEdges(
  fromNode, // 源节点
  routerFunction, // 路由函数
  routeMapping // 路由映射
);
```

### 7.2 路由函数

```javascript
// 路由函数接收 state，返回路由 key
function router(state) {
  if (state.score > 80) {
    return "high"; // 高分路径
  } else if (state.score > 60) {
    return "medium"; // 中等路径
  } else {
    return "low"; // 低分路径
  }
}

// 路由映射：key → 节点名
const routeMapping = {
  high: "celebrateNode",
  medium: "normalNode",
  low: "improveNode",
};

graph.addConditionalEdges("scoreNode", router, routeMapping);
```

### 7.3 条件分支示例

```javascript
// 情感分析后的条件路由
function sentimentRouter(state) {
  const sentiment = state.sentiment;
  if (sentiment.includes("积极")) return "positive";
  if (sentiment.includes("消极")) return "negative";
  return "neutral";
}

graph
  .addNode("analyze", analyzeNode)
  .addNode("positive", positiveNode)
  .addNode("negative", negativeNode)
  .addNode("neutral", neutralNode)
  .addEdge(START, "analyze")
  .addConditionalEdges("analyze", sentimentRouter, {
    positive: "positive",
    negative: "negative",
    neutral: "neutral",
  })
  .addEdge("positive", END)
  .addEdge("negative", END)
  .addEdge("neutral", END);
```

### 7.4 流程图示例

```
条件分支流程:

                          ┌───────────┐
                     ┌───▶│ positive  │───┐
                     │    └───────────┘   │
    ┌───────┐    ┌───────┐               │     ┌─────┐
    │ START │───▶│analyze│               ├────▶│ END │
    └───────┘    └───────┘               │     └─────┘
                     │    ┌───────────┐   │
                     ├───▶│ negative  │───┤
                     │    └───────────┘   │
                     │    ┌───────────┐   │
                     └───▶│  neutral  │───┘
                          └───────────┘
```

---

## 8. 循环流程

### 8.1 循环的实现

LangGraph 通过条件边实现循环：当条件满足时，流程回到之前的节点。

```javascript
function shouldContinue(state) {
  if (state.iterations >= 3) {
    return "end"; // 结束循环
  }
  if (state.isComplete) {
    return "end"; // 任务完成
  }
  return "continue"; // 继续循环
}

graph
  .addNode("process", processNode)
  .addNode("check", checkNode)
  .addEdge(START, "process")
  .addEdge("process", "check")
  .addConditionalEdges("check", shouldContinue, {
    continue: "process", // 循环回 process
    end: END,
  });
```

### 8.2 防止无限循环

```javascript
// ⚠️ 关键：一定要设置最大迭代次数

function shouldContinue(state) {
  // 安全保护：最多迭代 N 次
  if (state.iterations >= MAX_ITERATIONS) {
    console.warn("达到最大迭代次数，强制结束");
    return "end";
  }

  // 正常的结束条件
  if (state.isComplete) {
    return "end";
  }

  return "continue";
}
```

### 8.3 流程图示例

```
循环流程:

    ┌───────┐     ┌─────────┐     ┌───────┐
    │ START │────▶│ process │────▶│ check │
    └───────┘     └─────────┘     └───────┘
                       ▲              │
                       │   continue   │
                       └──────────────┤
                                      │ end
                                      ▼
                                  ┌─────┐
                                  │ END │
                                  └─────┘
```

---

## 9. ReAct Agent 模式

### 9.1 什么是 ReAct

ReAct = Reasoning + Acting，是一种让 LLM 使用工具的模式：

```
1. Reasoning (推理): LLM 分析问题，决定需要什么信息
2. Acting (行动): 调用工具获取信息
3. Observation (观察): 查看工具返回结果
4. 循环: 直到可以给出最终答案
```

### 9.2 ReAct 流程图

```
ReAct Agent 流程:

    ┌───────┐     ┌───────┐     ┌───────┐
    │ START │────▶│ agent │────▶│router │
    └───────┘     └───────┘     └───────┘
                       ▲              │
                       │              ├─── has_tools ───▶ ┌───────┐
                       │              │                   │ tools │
                       │              │                   └───────┘
                       │              │                        │
                       └──────────────┼────────────────────────┘
                                      │
                                      └─── no_tools ───▶ ┌─────┐
                                                         │ END │
                                                         └─────┘
```

### 9.3 完整实现

```javascript
import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { HumanMessage } from "@langchain/core/messages";

// 1. 定义状态
const AgentState = Annotation.Root({
  messages: Annotation({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
});

// 2. 定义工具
const tools = [calculatorTool, searchTool, weatherTool];
const llmWithTools = llm.bindTools(tools);

// 3. Agent 节点
async function agentNode(state) {
  const response = await llmWithTools.invoke(state.messages);
  return { messages: [response] };
}

// 4. 工具节点（使用内置）
const toolNode = new ToolNode(tools);

// 5. 路由函数
function shouldCallTools(state) {
  const lastMessage = state.messages[state.messages.length - 1];
  if (lastMessage.tool_calls?.length > 0) {
    return "tools";
  }
  return "end";
}

// 6. 构建图
const agentGraph = new StateGraph(AgentState)
  .addNode("agent", agentNode)
  .addNode("tools", toolNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldCallTools, {
    tools: "tools",
    end: END,
  })
  .addEdge("tools", "agent"); // 关键：工具执行完回到 agent

// 7. 编译和执行
const agent = agentGraph.compile();
const result = await agent.invoke({
  messages: [new HumanMessage("北京天气怎么样？")],
});
```

### 9.4 ReAct 执行流程示例

```
用户: "北京天气怎么样？"

Step 1: agent 节点
  - LLM 分析问题
  - 决定调用 get_weather 工具
  - 返回 tool_calls: [{name: "get_weather", args: {city: "北京"}}]

Step 2: router 判断
  - 检测到 tool_calls
  - 路由到 tools 节点

Step 3: tools 节点
  - 执行 get_weather("北京")
  - 返回 ToolMessage: "北京：晴天，15°C"

Step 4: 回到 agent 节点
  - LLM 看到工具结果
  - 生成最终回答
  - 无 tool_calls

Step 5: router 判断
  - 无 tool_calls
  - 路由到 END

最终输出: "北京今天晴天，气温15°C，是个好天气！"
```

### 9.5 重要概念：llmWithTools vs toolNode

很多初学者容易混淆 `llmWithTools` 和 `toolNode`，它们的区别如下：

```javascript
const llmWithTools = llm.bindTools(tools); // 告诉 LLM "你有这些工具可用"
const toolNode = new ToolNode(tools); // 真正执行工具的节点
```

| 概念           | 作用                                   | 是节点吗 | 在哪里使用            |
| -------------- | -------------------------------------- | -------- | --------------------- |
| `llmWithTools` | LLM 知道有哪些工具，会说"我要调用 xxx" | ❌ 不是  | 在 agentNode 内部调用 |
| `agentNode`    | 调用 LLM，让它决定是否需要工具         | ✅ 是    | 作为节点添加到图中    |
| `toolNode`     | 真正执行工具调用，拿到结果             | ✅ 是    | 作为节点添加到图中    |

**形象理解**：

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  agentNode (内部用 llmWithTools)                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │  LLM 思考: "用户问天气，我需要调用 get_weather 工具"      │   │
│  │           ↓                                             │   │
│  │  输出: tool_calls: [{name: "get_weather", args: {...}}] │   │
│  │        （只是"说"要调用，并没有真的调用）                  │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  toolNode (真正执行工具)                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │  执行: get_weather("北京")                               │   │
│  │  返回: "北京：晴天，15°C"                                 │   │
│  │        （真正调用工具，拿到结果）                          │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**总结**：

- `llmWithTools` = LLM 的"工具说明书"（让 LLM 知道有什么工具）
- `agentNode` = "决策者"（决定要不要用工具）
- `toolNode` = "执行者"（真正去调用工具）

> 💡 **记忆口诀**：llmWithTools 让 LLM "知道"工具，toolNode 让工具"执行"！

---

## 10. 流式输出

### 10.1 invoke vs stream

```javascript
// invoke: 等待全部完成后返回
const result = await app.invoke(initialState);
console.log(result); // 最终状态

// stream: 实时返回每个节点的输出
const stream = app.stream(initialState);
for await (const event of stream) {
  console.log(event); // 每个节点的输出
}
```

### 10.2 Stream 事件格式

```javascript
for await (const event of app.stream(state)) {
  // event 是一个对象，key 是节点名，value 是该节点的输出
  // 例如: { "agent": { messages: [...] } }

  for (const [nodeName, output] of Object.entries(event)) {
    console.log(`节点 ${nodeName} 执行完成`);
    console.log(`输出:`, output);
  }
}
```

### 10.3 流式输出的优势

```
1. 用户体验: 实时看到执行进度，减少等待焦虑
2. 调试方便: 可以看到每一步的中间结果
3. 早期失败: 如果某个节点出错，可以尽早发现
4. 内存友好: 不需要等待所有结果，边处理边输出
```

---

## 11. 最佳实践

### 11.1 状态设计

```javascript
// ✅ 好的状态设计
const GoodState = Annotation.Root({
  // 清晰的字段命名
  userQuestion: Annotation({ ... }),

  // 使用合适的 reducer
  chatHistory: Annotation({
    reducer: (prev, next) => [...prev, ...next],  // 累加
  }),

  // 有明确的默认值
  retryCount: Annotation({
    default: () => 0,
  }),
});

// ❌ 不好的状态设计
const BadState = Annotation.Root({
  data: Annotation({ ... }),  // 命名模糊
  x: Annotation({ ... }),     // 含义不明
});
```

### 11.2 节点设计

```javascript
// ✅ 好的节点设计：单一职责
async function translateNode(state) {
  const translated = await llm.invoke([...]);
  return { translatedText: translated.content };
}

async function analyzeNode(state) {
  const analysis = await llm.invoke([...]);
  return { analysisResult: analysis.content };
}

// ❌ 不好的节点设计：职责过多
async function doEverythingNode(state) {
  // 翻译
  // 分析
  // 总结
  // 生成报告
  // ...
}
```

### 11.3 错误处理

```javascript
async function safeNode(state) {
  try {
    const result = await riskyOperation(state);
    return { result, error: null };
  } catch (error) {
    console.error("节点执行失败:", error);
    return { result: null, error: error.message };
  }
}

// 在路由中处理错误
function router(state) {
  if (state.error) {
    return "errorHandler"; // 转到错误处理节点
  }
  return "nextStep";
}
```

### 11.4 循环安全

```javascript
// 总是设置最大迭代次数
const MAX_ITERATIONS = 10;

function loopRouter(state) {
  // 1. 先检查迭代次数
  if (state.iterations >= MAX_ITERATIONS) {
    console.warn("⚠️ 达到最大迭代次数");
    return "end";
  }

  // 2. 再检查业务条件
  if (state.isComplete) {
    return "end";
  }

  return "continue";
}
```

---

## 12. 与 LangChain 的关系

### 12.1 定位区别

```
LangChain:
  - 基础组件: LLM、Prompt、Tools、Memory
  - 简单组合: pipe()、RunnableSequence
  - 线性流程

LangGraph:
  - 工作流编排
  - 复杂流程: 分支、循环、并行
  - Agent 模式
```

### 12.2 配合使用

```javascript
// LangChain 组件
import { ChatDeepSeek } from "@langchain/deepseek";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { DynamicStructuredTool } from "@langchain/core/tools";

// LangGraph 编排
import { StateGraph, Annotation } from "@langchain/langgraph";

// 组合使用
const llm = new ChatDeepSeek({ ... });
const tools = [new DynamicStructuredTool({ ... })];
const llmWithTools = llm.bindTools(tools);  // LangChain

const graph = new StateGraph(State)         // LangGraph
  .addNode("agent", async (state) => {
    const response = await llmWithTools.invoke(state.messages);
    return { messages: [response] };
  });
```

### 12.3 选择指南

| 场景                         | 选择             |
| ---------------------------- | ---------------- |
| 简单的 Prompt → LLM → Parser | LangChain pipe() |
| RAG 检索问答                 | LangChain        |
| 多步骤生成流程               | 两者都可         |
| 条件分支逻辑                 | LangGraph        |
| 循环/迭代任务                | LangGraph        |
| 复杂 Agent                   | LangGraph        |
| 多 Agent 协作                | LangGraph        |

---

## 🎯 快速参考

### 常用导入

```javascript
import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
```

### 完整模板

```javascript
// 1. 定义状态
const MyState = Annotation.Root({
  input: Annotation({ reducer: (_, x) => x, default: () => "" }),
  output: Annotation({ reducer: (_, x) => x, default: () => "" }),
});

// 2. 定义节点
async function myNode(state) {
  return { output: "processed" };
}

// 3. 定义路由
function myRouter(state) {
  return state.output ? "end" : "continue";
}

// 4. 构建图
const graph = new StateGraph(MyState)
  .addNode("myNode", myNode)
  .addEdge(START, "myNode")
  .addConditionalEdges("myNode", myRouter, {
    continue: "myNode",
    end: END,
  });

// 5. 编译执行
const app = graph.compile();
const result = await app.invoke({ input: "hello" });
```

---

## 📖 学习资源

- **官方文档**: https://langchain-ai.github.io/langgraphjs/
- **GitHub**: https://github.com/langchain-ai/langgraphjs
- **LangGraph Studio**: 可视化调试工具
- **示例代码**: `src/workflow.js`

---

## 13. 附录：LLM 参数配置

### 13.1 temperature 参数详解

`temperature` 是 LLM 中非常重要的参数，控制输出的**随机性/创造性**：

| 值          | 效果       | 输出特点                         |
| ----------- | ---------- | -------------------------------- |
| **0**       | 确定性最高 | 每次输出几乎相同，最"安全"的答案 |
| **0.1-0.3** | 低随机性   | 稳定、可预测、逻辑性强           |
| **0.5-0.7** | 中等随机性 | 平衡创造性和一致性               |
| **0.8-1.0** | 高随机性   | 更有创意，但可能不太连贯         |
| **>1.0**    | 非常随机   | 可能产生奇怪或无意义的输出       |

### 13.2 不同场景的推荐值

```
场景                          推荐 temperature
─────────────────────────────────────────────
代码生成 / 数学计算             0 ~ 0.2
数据提取 / 分类任务             0
问答 / 知识检索                 0 ~ 0.3
通用对话 / 聊天                 0.5 ~ 0.7
创意写作 / 故事生成             0.7 ~ 1.0
头脑风暴 / 发散思维             0.9 ~ 1.2
```

### 13.3 在 LangGraph 中的应用

```javascript
// 通用场景：使用中等 temperature
const llm = new ChatDeepSeek({
  model: "deepseek-chat",
  temperature: 0.7,  // 平衡创意和一致性
});

// 需要精确输出的节点：使用低 temperature
async function codeGenerationNode(state) {
  const precisionLLM = new ChatDeepSeek({
    temperature: 0.1,  // 代码生成需要精确
  });
  const response = await precisionLLM.invoke([...]);
  return { code: response.content };
}

// 需要创意的节点：使用高 temperature
async function brainstormNode(state) {
  const creativeLLM = new ChatDeepSeek({
    temperature: 0.9,  // 头脑风暴需要创意
  });
  const response = await creativeLLM.invoke([...]);
  return { ideas: response.content };
}
```

### 13.4 直观理解

```
temperature = 0:    "2+2等于多少" → 每次都是 "4"
temperature = 0.7:  "写一句问候" → "你好！" / "嗨，朋友！" / "很高兴见到你！"
temperature = 1.2:  "写一句问候" → "月光下的蝴蝶向你挥手！" (可能很奇怪)
```

### 13.5 最佳实践

```
1. 默认值：0.7 是一个安全的通用默认值
2. 精确任务：代码、数学、分类 → 降低到 0~0.3
3. 创意任务：写作、头脑风暴 → 提高到 0.8~1.0
4. 按需调整：在不同节点使用不同的 LLM 实例
5. 测试验证：多次运行观察输出变化，找到最佳值
```

---

> 💡 **学习建议**: 先从简单的串行流程开始，逐步添加条件分支，最后实现完整的 ReAct Agent。每一步都运行代码，观察状态的变化。
