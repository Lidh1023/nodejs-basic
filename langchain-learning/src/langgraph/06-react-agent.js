/**
 * LangGraph 入门 Demo 6: ReAct Agent
 *
 * 🎯 学习目标：
 * - 理解 ReAct (Reasoning + Acting) 模式
 * - 理解 Agent 如何自主决策调用工具
 * - 理解工具调用的循环流程
 *
 * 📝 这是 LangGraph 最核心的使用场景！
 *
 * ⚠️ 运行前请确保配置了 DEEPSEEK_API_KEY
 */

import { StateGraph, Annotation, END, START } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatDeepSeek } from "@langchain/deepseek";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { HumanMessage } from "@langchain/core/messages";
import { z } from "zod";
import "dotenv/config";

console.log("🚀 LangGraph Demo 6: ReAct Agent\n");
console.log("=".repeat(50));

// 检查 API Key
if (!process.env.DEEPSEEK_API_KEY) {
  console.log("❌ 错误：请先配置 DEEPSEEK_API_KEY 环境变量");
  process.exit(1);
}

// ============================================
// 第一步：定义工具
// ============================================

console.log("\n🔧 定义工具:\n");

// 工具 1: 计算器
const calculatorTool = new DynamicStructuredTool({
  name: "calculator",
  description: "执行数学计算，输入数学表达式，返回计算结果",
  schema: z.object({
    expression: z.string().describe("数学表达式，如: 2 + 3 * 4"),
  }),
  func: async ({ expression }) => {
    console.log(`   🔧 [calculator] 计算: ${expression}`);
    try {
      const result = Function(`"use strict"; return (${expression})`)();
      return `${expression} = ${result}`;
    } catch (error) {
      return `计算错误: ${error.message}`;
    }
  },
});
console.log("   ✅ calculator - 数学计算");

// 工具 2: 天气查询
const weatherTool = new DynamicStructuredTool({
  name: "get_weather",
  description: "获取城市天气信息",
  schema: z.object({
    city: z.string().describe("城市名称"),
  }),
  func: async ({ city }) => {
    console.log(`   🔧 [get_weather] 查询: ${city}`);
    // 模拟天气数据
    const data = {
      北京: "晴天，15°C，空气质量良好",
      上海: "多云，20°C，有轻微雾霾",
      深圳: "小雨，28°C，空气清新",
    };
    return data[city] || `${city}：晴天，22°C`;
  },
});
console.log("   ✅ get_weather - 天气查询");

// 工具 3: 时间查询
const timeTool = new DynamicStructuredTool({
  name: "get_time",
  description: "获取当前时间",
  schema: z.object({
    timezone: z.string().optional().describe("时区"),
  }),
  func: async ({ timezone = "Asia/Shanghai" }) => {
    console.log(`   🔧 [get_time] 查询时间`);
    return `当前时间: ${new Date().toLocaleString("zh-CN", { timeZone: timezone })}`;
  },
});
console.log("   ✅ get_time - 时间查询\n");

const tools = [calculatorTool, weatherTool, timeTool];

// ============================================
// 第二步：初始化 LLM 并绑定工具
// ============================================

const llm = new ChatDeepSeek({
  model: "deepseek-chat",
  temperature: 0,
});

// 关键：将工具绑定到 LLM
const llmWithTools = llm.bindTools(tools);

console.log("✅ LLM 已绑定工具\n");

// ============================================
// 第三步：定义状态
// ============================================

/**
 * Agent 状态的核心：messages 数组
 *
 * 使用累加 reducer，因为：
 * - 每次对话都会添加新消息
 * - 历史消息不能丢失
 */
const AgentState = Annotation.Root({
  messages: Annotation({
    reducer: (prev, next) => [...prev, ...next], // 累加消息！
    default: () => [],
  }),
});

console.log("📋 状态结构:");
console.log("   - messages: 消息列表（累加模式）\n");

// ============================================
// 第四步：定义 Agent 节点
// ============================================

/**
 * Agent 节点：调用 LLM，让它决定下一步
 *
 * LLM 可能：
 * 1. 直接回答（无 tool_calls）
 * 2. 请求调用工具（有 tool_calls）
 */
async function agentNode(state) {
  console.log(`   [Agent] 分析问题，决定下一步...`);

  const response = await llmWithTools.invoke(state.messages);

  if (response.tool_calls && response.tool_calls.length > 0) {
    console.log(`   [Agent] → 决定调用工具: ${response.tool_calls.map(t => t.name).join(", ")}`);
  } else {
    console.log(`   [Agent] → 直接回答`);
  }

  // 返回 AI 的响应，添加到 messages
  return { messages: [response] };
}

// 使用 LangGraph 内置的 ToolNode
const toolNode = new ToolNode(tools);

console.log("🔧 节点定义:");
console.log("   - agentNode: 调用 LLM 做决策");
console.log("   - toolNode: 执行工具调用\n");

// ============================================
// 第五步：定义路由函数
// ============================================

/**
 * 路由函数：检查是否需要调用工具
 *
 * 这是 ReAct 循环的核心！
 */
function shouldCallTools(state) {
  const lastMessage = state.messages[state.messages.length - 1];

  // 检查最后一条消息是否有 tool_calls
  if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
    console.log(`   [Router] → 需要调用工具，转到 tools 节点`);
    return "tools";
  }

  console.log(`   [Router] → 无工具调用，结束对话`);
  return "end";
}

console.log("🔀 路由函数: shouldCallTools");
console.log("   有 tool_calls → tools 节点");
console.log("   无 tool_calls → END\n");

// ============================================
// 第六步：构建 Agent 图
// ============================================

/**
 * ReAct Agent 的核心结构：
 *
 * START → agent → [检查] → tools → agent → [检查] → ... → END
 *
 * 循环直到 LLM 不再请求工具
 */
const graph = new StateGraph(AgentState)
  .addNode("agent", agentNode)
  .addNode("tools", toolNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldCallTools, {
    tools: "tools",
    end: END,
  })
  .addEdge("tools", "agent"); // 关键：工具执行完回到 agent！

console.log("🔗 流程图 (ReAct 循环):");
console.log("              ┌────────────────┐");
console.log("              │   tool_calls   │");
console.log("              ↓                │");
console.log("   START → agent → [router] ──┼── tools ──┘");
console.log("                      │");
console.log("                      └── no_tools → END\n");

// ============================================
// 第七步：编译并测试
// ============================================

const agent = graph.compile();

// 测试用例
const testQuestions = [
  "你好，介绍一下你自己",          // 不需要工具
  "北京今天天气怎么样？",          // 需要天气工具
  "帮我计算 (15 + 27) * 3",       // 需要计算器
  "现在几点了？北京天气怎么样？",   // 可能需要多个工具
];

console.log("▶️  开始测试 ReAct Agent...\n");

for (const question of testQuestions) {
  console.log("═".repeat(50));
  console.log(`🤔 用户: ${question}`);
  console.log("-".repeat(50));

  const result = await agent.invoke({
    messages: [new HumanMessage(question)],
  });

  // 获取最后一条 AI 消息作为回答
  const lastMessage = result.messages[result.messages.length - 1];
  console.log("-".repeat(50));
  console.log(`💬 Agent: ${lastMessage.content}`);
  console.log("\n");
}

// ============================================
// 重点理解
// ============================================

console.log("=".repeat(50));
console.log("💡 重点理解 - ReAct 循环:\n");
console.log("   ReAct = Reasoning + Acting\n");
console.log("   1️⃣  Reasoning (推理):");
console.log("      Agent 分析问题，决定是否需要工具\n");
console.log("   2️⃣  Acting (行动):");
console.log("      如果需要，调用工具获取信息\n");
console.log("   3️⃣  Observation (观察):");
console.log("      获取工具返回结果\n");
console.log("   4️⃣  Loop (循环):");
console.log("      回到 Agent，继续推理...\n");
console.log("   5️⃣  Response (回复):");
console.log("      直到 Agent 认为可以回答，不再调用工具\n");
console.log("   这就是 AI Agent 自主决策的核心！");
console.log("=".repeat(50));

// ============================================
// 动手练习
// ============================================

console.log("\n🎯 动手练习:");
console.log("   1. 添加一个「搜索」工具");
console.log("   2. 添加一个「记事本」工具，可以保存和读取笔记");
console.log("   3. 测试需要多次工具调用的复杂问题");
console.log("   4. 添加错误处理：工具调用失败时如何处理？");

