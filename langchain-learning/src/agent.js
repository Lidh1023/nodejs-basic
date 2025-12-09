/**
 * LangChain Agent 入门 Demo
 *
 * 🎯 学习目标：
 * - 理解什么是 Agent（智能代理）
 * - 理解 Agent 与普通 LLM 调用的区别
 * - 理解 ReAct (Reasoning + Acting) 模式
 * - 掌握 Agent 的核心工作流程
 *
 * 📝 Agent 是 LangChain 最核心的概念之一！
 *
 * ⚠️ 运行前请确保配置了 DEEPSEEK_API_KEY
 */

import { StateGraph, Annotation, END, START } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatDeepSeek } from "@langchain/deepseek";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { TavilySearch } from "@langchain/tavily";
import { z } from "zod";
import "dotenv/config";

console.log("🤖 LangChain Agent 入门 Demo\n");
console.log("=".repeat(60));

// ============================================
// 前置检查
// ============================================

if (!process.env.DEEPSEEK_API_KEY) {
  console.log("❌ 错误：请先配置 DEEPSEEK_API_KEY 环境变量");
  console.log("   在 .env 文件中添加: DEEPSEEK_API_KEY=your_api_key");
  process.exit(1);
}

// ============================================
// 📚 知识点 1：什么是 Agent？
// ============================================

console.log("\n📚 知识点 1：什么是 Agent？\n");
console.log(`
┌────────────────────────────────────────────────────────────┐
│                     Agent vs 普通 LLM                       │
├────────────────────────────────────────────────────────────┤
│  普通 LLM:                                                  │
│    用户提问 → LLM 回答 → 结束                               │
│    （一问一答，无法执行操作）                                │
│                                                            │
│  Agent:                                                    │
│    用户提问 → 思考 → 使用工具 → 观察结果 → 再思考           │
│           → 使用工具 → 观察结果 → ... → 最终回答            │
│    （可以自主决策，循环执行直到完成任务）                    │
└────────────────────────────────────────────────────────────┘

🔑 核心区别：
   • 普通 LLM：只能"说"，不能"做"
   • Agent：既能"思考"，又能"行动"

💡 Agent = LLM + Tools + 自主决策能力
`);

// ============================================
// 📚 知识点 2：ReAct 模式
// ============================================

console.log("📚 知识点 2：ReAct 模式\n");
console.log(`
┌────────────────────────────────────────────────────────────┐
│              ReAct = Reasoning + Acting                     │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  1️⃣  Thought (思考)                                        │
│      "用户问北京天气，我需要调用天气工具"                    │
│                      ↓                                      │
│  2️⃣  Action (行动)                                         │
│      调用 get_weather(city="北京")                          │
│                      ↓                                      │
│  3️⃣  Observation (观察)                                    │
│      收到结果："北京，晴天，15°C"                            │
│                      ↓                                      │
│  4️⃣  Thought (再思考)                                      │
│      "我已经获得了天气信息，可以回答用户了"                  │
│                      ↓                                      │
│  5️⃣  Answer (回答)                                         │
│      "北京今天晴天，气温 15°C，适合出行！"                   │
│                                                            │
└────────────────────────────────────────────────────────────┘

🔄 ReAct 是一个循环过程：思考 → 行动 → 观察 → 思考 → ...
   直到 Agent 认为可以给出最终答案
`);

// ============================================
// 第一步：定义工具
// ============================================

console.log("=".repeat(60));
console.log("\n🔧 第一步：定义工具\n");

/**
 * 工具 1: 天气查询
 *
 * 工具是 Agent 的"手和脚"，让 Agent 能够：
 * - 查询外部信息
 * - 执行计算
 * - 调用 API
 * - 操作系统
 */
const weatherTool = new DynamicStructuredTool({
  name: "get_weather",
  description: "获取城市天气信息。当用户询问天气时使用此工具。",
  schema: z.object({
    city: z.string().describe("城市名称，如：北京、上海、深圳"),
  }),
  func: async ({ city }) => {
    console.log(`   🌤️  [天气工具] 查询 ${city} 的天气...`);

    // 模拟天气数据（实际应用中会调用真实 API）
    const weatherData = {
      北京: { temp: 15, condition: "晴天", humidity: 45, wind: "北风3级" },
      上海: { temp: 20, condition: "多云", humidity: 65, wind: "东风2级" },
      深圳: { temp: 28, condition: "小雨", humidity: 80, wind: "南风1级" },
      广州: { temp: 26, condition: "阴天", humidity: 70, wind: "东南风2级" },
    };

    const data = weatherData[city] || {
      temp: 22,
      condition: "晴天",
      humidity: 50,
      wind: "微风",
    };

    return JSON.stringify({
      city,
      temperature: `${data.temp}°C`,
      condition: data.condition,
      humidity: `${data.humidity}%`,
      wind: data.wind,
    });
  },
});

/**
 * 工具 2: 计算器
 */
const calculatorTool = new DynamicStructuredTool({
  name: "calculator",
  description: "执行数学计算。当需要进行加减乘除等数学运算时使用此工具。",
  schema: z.object({
    expression: z.string().describe("数学表达式，如: 2 + 3 * 4, 100 / 5"),
  }),
  func: async ({ expression }) => {
    console.log(`   🧮 [计算器] 计算: ${expression}`);
    try {
      const result = Function(`"use strict"; return (${expression})`)();
      return `${expression} = ${result}`;
    } catch (error) {
      return `计算错误: ${error.message}`;
    }
  },
});

/**
 * 工具 3: Tavily 搜索引擎（真实搜索）
 *
 * Tavily 是专门为 AI Agent 设计的搜索 API
 * 需要配置环境变量: TAVILY_API_KEY
 * 获取 API Key: https://tavily.com/
 */
const searchTool = new TavilySearch({
  maxResults: 3, // 返回最多 3 条结果
  // 可选配置:
  // searchDepth: "advanced", // 搜索深度: "basic" 或 "advanced"
  // includeRawContent: true, // 是否包含原始内容
});

// 包装 Tavily 工具，添加日志输出
const wrappedSearchTool = new DynamicStructuredTool({
  name: "tavily_search",
  description:
    "使用 Tavily 在互联网上搜索实时信息。当需要查询最新资讯、新闻、技术文档或不确定的知识时使用此工具。",
  schema: z.object({
    query: z.string().describe("搜索关键词"),
  }),
  func: async ({ query }) => {
    console.log(`   🔍 [Tavily搜索] 正在搜索: "${query}"`);

    try {
      // 调用 Tavily 搜索
      const result = await searchTool.invoke({ query });
      console.log(`   🔍 [Tavily搜索] 搜索完成，获取到结果`);
      return result;
    } catch (error) {
      console.log(`   ❌ [Tavily搜索] 搜索失败: ${error.message}`);

      // 检查是否是 API Key 问题
      if (!process.env.TAVILY_API_KEY) {
        return "搜索失败：未配置 TAVILY_API_KEY。请在 .env 文件中添加 TAVILY_API_KEY=your_api_key";
      }
      return `搜索失败: ${error.message}`;
    }
  },
});

/**
 * 工具 4: 时间查询
 */
const timeTool = new DynamicStructuredTool({
  name: "get_time",
  description: "获取当前时间和日期。",
  schema: z.object({
    timezone: z.string().optional().describe("时区，默认为 Asia/Shanghai"),
  }),
  func: async ({ timezone = "Asia/Shanghai" }) => {
    console.log(`   ⏰ [时间工具] 获取当前时间...`);
    const now = new Date();
    return `当前时间: ${now.toLocaleString("zh-CN", { timeZone: timezone })}`;
  },
});

// 工具列表
const tools = [weatherTool, calculatorTool, wrappedSearchTool, timeTool];

console.log("   ✅ 已创建 4 个工具:");
console.log("      • get_weather - 天气查询");
console.log("      • calculator - 数学计算");
console.log("      • tavily_search - Tavily 网络搜索（真实搜索）");
console.log("      • get_time - 时间查询");

// 检查 Tavily API Key
if (!process.env.TAVILY_API_KEY) {
  console.log("\n   ⚠️  提示: 未配置 TAVILY_API_KEY");
  console.log("      搜索工具将无法正常工作");
  console.log("      请在 .env 文件中添加: TAVILY_API_KEY=your_api_key");
  console.log("      获取 API Key: https://tavily.com/");
}

// ============================================
// 第二步：初始化 LLM 并绑定工具
// ============================================

console.log("\n🧠 第二步：初始化 LLM 并绑定工具\n");

const llm = new ChatDeepSeek({
  model: "deepseek-chat",
  temperature: 0, // 工具调用建议使用低温度，确保稳定性
});

// 关键：将工具绑定到 LLM
// 这让 LLM 知道有哪些工具可用
const llmWithTools = llm.bindTools(tools);

console.log("   ✅ LLM 已初始化");
console.log("   ✅ 工具已绑定到 LLM");

// ============================================
// 第三步：定义 Agent 状态
// ============================================

console.log("\n📋 第三步：定义 Agent 状态\n");

/**
 * Agent 状态的核心是 messages 数组
 *
 * 为什么使用累加 reducer？
 * - 对话是连续的，每条消息都需要保留
 * - LLM 需要看到完整的对话历史
 * - 包括用户消息、AI 回复、工具调用结果等
 */
const AgentState = Annotation.Root({
  messages: Annotation({
    reducer: (prev, next) => [...prev, ...next], // 累加模式
    default: () => [],
  }),
});

console.log("   状态结构:");
console.log("   └── messages: 消息列表（累加模式）");
console.log("       ├── HumanMessage: 用户消息");
console.log("       ├── AIMessage: AI 回复/工具调用请求");
console.log("       └── ToolMessage: 工具执行结果");

// ============================================
// 第四步：定义 Agent 节点
// ============================================

console.log("\n🔄 第四步：定义 Agent 节点\n");

/**
 * Agent 节点：大脑
 *
 * 这是 Agent 的核心决策中心：
 * 1. 分析当前对话状态
 * 2. 决定是否需要调用工具
 * 3. 如果需要，指定调用哪个工具及参数
 * 4. 如果不需要，直接给出回答
 */
async function agentNode(state) {
  console.log("\n   🧠 [Agent节点] 思考中...");

  // 调用 LLM 进行推理
  const response = await llmWithTools.invoke(state.messages);

  // 检查 LLM 的决策
  if (response.tool_calls && response.tool_calls.length > 0) {
    const toolNames = response.tool_calls.map((t) => t.name).join(", ");
    console.log(`   🧠 [Agent节点] 决定调用工具: ${toolNames}`);
  } else {
    console.log("   🧠 [Agent节点] 无需工具，直接回答");
  }

  // 返回 AI 的响应，添加到 messages
  return { messages: [response] };
}

/**
 * 工具节点：双手
 *
 * 使用 LangGraph 内置的 ToolNode
 * 它会自动：
 * 1. 解析 AI 的 tool_calls
 * 2. 执行对应的工具
 * 3. 将结果包装成 ToolMessage 返回
 */
const toolNode = new ToolNode(tools);

console.log("   节点定义:");
console.log("   ├── agentNode: 大脑（思考、决策）");
console.log("   └── toolNode: 双手（执行工具）");

// ============================================
// 第五步：定义路由函数
// ============================================

console.log("\n🔀 第五步：定义路由函数\n");

/**
 * 路由函数：交通灯
 *
 * 决定 Agent 的下一步：
 * - 有 tool_calls → 去工具节点执行
 * - 无 tool_calls → 任务完成，结束
 */
function shouldCallTools(state) {
  const lastMessage = state.messages[state.messages.length - 1];

  if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
    console.log("   🔀 [路由] 需要调用工具 → tools");
    return "tools";
  }

  console.log("   🔀 [路由] 任务完成 → END");
  return "end";
}

console.log("   路由规则:");
console.log("   ├── 有 tool_calls → 去 tools 节点");
console.log("   └── 无 tool_calls → 结束 (END)");

// ============================================
// 第六步：构建 Agent 图
// ============================================

console.log("\n🏗️  第六步：构建 Agent 图\n");

/**
 * 使用 StateGraph 构建 Agent
 *
 * 这是一个有向图，定义了：
 * - 节点（做什么）
 * - 边（怎么连接）
 * - 条件边（根据状态决定下一步）
 */
const graph = new StateGraph(AgentState)
  // 添加节点
  .addNode("agent", agentNode) // 思考节点
  .addNode("tools", toolNode) // 工具节点

  // 添加边
  .addEdge(START, "agent") // 入口 → agent
  .addConditionalEdges(
    // agent → 条件分支
    "agent",
    shouldCallTools,
    {
      tools: "tools", // 需要工具 → tools
      end: END, // 不需要 → 结束
    }
  )
  .addEdge("tools", "agent"); // tools → agent（循环回来！）

console.log("   Agent 流程图:");
console.log("");
console.log("                    ┌──────────────┐");
console.log("                    │              │");
console.log("                    ▼              │ 工具执行完");
console.log("   START ──► [agent] ──► [tools] ──┘");
console.log("                │");
console.log("                │ 无需工具");
console.log("                ▼");
console.log("               END");
console.log("");
console.log("   📌 关键：tools → agent 形成循环！");
console.log("      这让 Agent 可以多次调用工具");

// ============================================
// 第七步：编译并测试
// ============================================

console.log("\n🚀 第七步：编译并测试\n");

// 编译图，生成可执行的 Agent
const agent = graph.compile();

console.log("   ✅ Agent 编译完成！\n");

// ============================================
// 辅助函数：打印详细消息列表
// ============================================

/**
 * 打印消息列表的详细信息
 * 用于调试和理解 Agent 的处理过程
 */
function printDetailedMessages(messages) {
  console.log("\n   📋 ═══════════════════════════════════════════════════");
  console.log("   📋 详细消息列表（大模型处理过程）");
  console.log("   📋 ═══════════════════════════════════════════════════\n");

  messages.forEach((msg, index) => {
    const msgType = msg.constructor.name;
    console.log(`   ┌─ 消息 ${index + 1}: ${msgType}`);

    // 根据消息类型打印不同信息
    switch (msgType) {
      case "HumanMessage":
        console.log(`   │  📝 类型: 用户消息`);
        console.log(`   │  💬 内容: ${msg.content}`);
        break;

      case "AIMessage":
        console.log(`   │  🤖 类型: AI 消息`);
        if (msg.content) {
          console.log(
            `   │  💬 内容: ${msg.content.substring(0, 200)}${
              msg.content.length > 200 ? "..." : ""
            }`
          );
        }
        if (msg.tool_calls && msg.tool_calls.length > 0) {
          console.log(`   │  🔧 工具调用:`);
          msg.tool_calls.forEach((tc, i) => {
            console.log(`   │     [${i + 1}] 工具名: ${tc.name}`);
            console.log(`   │         参数: ${JSON.stringify(tc.args)}`);
            console.log(`   │         调用ID: ${tc.id}`);
          });
        }
        break;

      case "ToolMessage":
        console.log(`   │  🔧 类型: 工具返回消息`);
        console.log(`   │  📌 工具调用ID: ${msg.tool_call_id}`);
        console.log(`   │  📌 工具名称: ${msg.name || "未知"}`);
        // 格式化输出工具返回内容
        try {
          const content =
            typeof msg.content === "string"
              ? msg.content
              : JSON.stringify(msg.content);
          if (content.length > 500) {
            console.log(`   │  📄 返回内容 (截取前500字符):`);
            console.log(`   │     ${content.substring(0, 500)}...`);
          } else {
            console.log(`   │  📄 返回内容:`);
            console.log(`   │     ${content}`);
          }
        } catch (e) {
          console.log(`   │  📄 返回内容: ${msg.content}`);
        }
        break;

      default:
        console.log(`   │  📝 类型: ${msgType}`);
        console.log(
          `   │  💬 内容: ${JSON.stringify(msg.content).substring(0, 200)}`
        );
    }

    console.log(`   └─────────────────────────────────────────────────────\n`);
  });

  console.log("   📋 ═══════════════════════════════════════════════════\n");
}

// ============================================
// 测试用例
// ============================================

console.log("═".repeat(60));
console.log("📝 开始测试 Agent\n");

// 测试用例列表
const testCases = [
  {
    description: "测试 1: 简单对话（不需要工具）",
    question: "你好，你是谁？",
    showDetails: false,
  },
  {
    description: "测试 2: 单个工具调用",
    question: "北京今天天气怎么样？",
    showDetails: false,
  },
  {
    description: "测试 3: 数学计算",
    question: "帮我计算 (25 + 75) * 2 等于多少？",
    showDetails: false,
  },
  {
    description: "测试 4: 多工具组合",
    question: "现在几点了？深圳天气如何？",
    showDetails: false,
  },
  {
    description: "测试 5: Tavily 搜索（显示详细过程）",
    question: "什么是 LangGraph？请搜索最新信息",
    showDetails: true, // 显示详细消息列表
  },
];

// 执行测试
for (const testCase of testCases) {
  console.log("─".repeat(60));
  console.log(`\n${testCase.description}`);
  console.log(`🤔 用户: ${testCase.question}`);
  console.log("");

  try {
    // 调用 Agent
    const result = await agent.invoke({
      messages: [new HumanMessage(testCase.question)],
    });

    // 如果需要显示详细信息，打印完整消息列表
    if (testCase.showDetails) {
      printDetailedMessages(result.messages);
    }

    // 获取最后一条 AI 消息作为回答
    const finalMessage = result.messages[result.messages.length - 1];
    console.log("\n💬 Agent 回答:");
    console.log(`   ${finalMessage.content}`);

    // 显示消息数量（用于理解循环次数）
    console.log(`\n   📊 总消息数: ${result.messages.length}`);

    // 如果是搜索测试，额外说明消息流程
    if (testCase.showDetails) {
      console.log("\n   📝 消息流程说明:");
      console.log("      1. HumanMessage: 用户的问题");
      console.log("      2. AIMessage (带 tool_calls): LLM 决定调用哪个工具");
      console.log("      3. ToolMessage: 工具执行后的返回结果");
      console.log("      4. AIMessage: LLM 根据工具结果生成最终回答");
    }
  } catch (error) {
    console.log(`   ❌ 错误: ${error.message}`);
    if (error.message.includes("TAVILY") || error.message.includes("API")) {
      console.log("   💡 提示: 请确保已配置 TAVILY_API_KEY 环境变量");
    }
  }

  console.log("");
}

// ============================================
// 知识点总结
// ============================================

console.log("═".repeat(60));
console.log("\n📚 Agent 核心知识点总结\n");

console.log(`
┌────────────────────────────────────────────────────────────┐
│                    Agent 的组成部分                         │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  1. 🧠 LLM（大脑）                                          │
│     负责理解、推理、做决策                                   │
│                                                            │
│  2. 🔧 Tools（双手）                                        │
│     执行具体操作：查询、计算、API 调用等                      │
│                                                            │
│  3. 📋 State（记忆）                                        │
│     保存对话历史和上下文                                     │
│                                                            │
│  4. 🔄 Loop（循环机制）                                     │
│     思考 → 行动 → 观察 → 再思考 → ...                       │
│                                                            │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│                    ReAct 循环过程                           │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  用户: "北京天气怎么样？"                                    │
│                                                            │
│  [循环 1]                                                   │
│    Thought: 用户问天气，需要调用天气工具                     │
│    Action:  get_weather(city="北京")                        │
│    Observation: {"city":"北京","temp":"15°C",...}           │
│                                                            │
│  [循环 2]                                                   │
│    Thought: 已获取天气信息，可以回答了                       │
│    Answer:  北京今天晴天，气温 15°C，适合出行！              │
│                                                            │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│                    关键代码模式                             │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  // 1. 定义工具                                             │
│  const tools = [weatherTool, calculatorTool, ...];          │
│                                                            │
│  // 2. 绑定工具到 LLM                                       │
│  const llmWithTools = llm.bindTools(tools);                 │
│                                                            │
│  // 3. 构建 Agent 图                                        │
│  const graph = new StateGraph(AgentState)                   │
│    .addNode("agent", agentNode)                             │
│    .addNode("tools", toolNode)                              │
│    .addEdge(START, "agent")                                 │
│    .addConditionalEdges("agent", shouldCallTools, {...})    │
│    .addEdge("tools", "agent");  // 关键：形成循环            │
│                                                            │
│  // 4. 编译并调用                                           │
│  const agent = graph.compile();                             │
│  const result = await agent.invoke({ messages: [...] });    │
│                                                            │
└────────────────────────────────────────────────────────────┘
`);

// ============================================
// 进阶练习建议
// ============================================

console.log("═".repeat(60));
console.log("\n🎯 进阶练习建议\n");

console.log(`
1. 添加更多工具
   - 翻译工具（中英互译）
   - 数据库查询工具
   - 文件操作工具

2. 实现工具的错误处理
   - 工具调用失败时如何重试？
   - 如何优雅地告知用户？

3. 添加对话记忆
   - 使用 MemorySaver 保存对话历史
   - 实现多轮对话上下文

4. 尝试复杂任务
   - "先查询北京天气，如果温度低于 20 度就提醒穿外套"
   - "计算今天距离 2026 年还有多少天"

5. 学习 LangGraph 高级特性
   - 人工审核节点
   - 并行工具调用
   - 子图和嵌套 Agent
`);

console.log("═".repeat(60));
console.log("\n✅ Agent Demo 运行完成！");
console.log("📖 请查看 AGENT_知识点详解.md 获取更多学习资料");
console.log("🔍 Tavily Search API: https://tavily.com/\n");
