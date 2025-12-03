/**
 * LangGraph 入门 Demo 9: 带记忆的 ReAct Agent
 *
 * 🎯 学习目标：
 * - 将 MemorySaver 与 ReAct Agent 结合
 * - 理解 Agent 如何利用对话历史做决策
 * - 实现多轮工具调用的复杂场景
 * - 学习 Agent 的上下文记忆能力
 *
 * 📝 这是结合记忆和工具的高级示例
 *
 * ⚠️ 运行前请确保配置了 DEEPSEEK_API_KEY
 */

import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatDeepSeek } from "@langchain/deepseek";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import "dotenv/config";

console.log("🚀 LangGraph Demo 9: 带记忆的 ReAct Agent\n");
console.log("=".repeat(60));

// 检查 API Key
if (!process.env.DEEPSEEK_API_KEY) {
  console.log("❌ 错误：请先配置 DEEPSEEK_API_KEY 环境变量");
  process.exit(1);
}

// ============================================
// 核心概念解释
// ============================================

console.log("\n📚 本节要点:\n");
console.log("   ┌─────────────────────────────────────────────────────┐");
console.log("   │  ReAct Agent + MemorySaver = 智能助手               │");
console.log("   │                                                     │");
console.log("   │  ReAct: 让 Agent 能够使用工具（计算器、搜索等）       │");
console.log("   │  MemorySaver: 让 Agent 记住对话历史                  │");
console.log("   │                                                     │");
console.log("   │  结合后的效果：                                       │");
console.log("   │  - Agent 能调用工具完成任务                          │");
console.log("   │  - Agent 记得之前的对话和工具使用结果                 │");
console.log("   │  - 可以基于历史信息做出更好的决策                     │");
console.log("   └─────────────────────────────────────────────────────┘\n");

// ============================================
// 第一步：创建 MemorySaver
// ============================================

const memory = new MemorySaver();
console.log("✅ 第一步：创建 MemorySaver 实例\n");

// ============================================
// 第二步：定义工具
// ============================================

console.log("🔧 第二步：定义工具集\n");

// 工具 1: 计算器
const calculatorTool = new DynamicStructuredTool({
  name: "calculator",
  description:
    "执行数学计算。输入一个数学表达式（如 '2 + 3 * 4'），返回计算结果。",
  schema: z.object({
    expression: z.string().describe("要计算的数学表达式"),
  }),
  func: async ({ expression }) => {
    console.log(`   🧮 [calculator] 计算: ${expression}`);
    try {
      // 使用 Function 构造器进行安全计算
      const result = Function(`"use strict"; return (${expression})`)();
      const output = `${expression} = ${result}`;
      console.log(`   🧮 [calculator] 结果: ${result}`);
      return output;
    } catch (error) {
      return `计算错误: ${error.message}`;
    }
  },
});
console.log("   ✅ calculator - 数学计算器");

// 工具 2: 天气查询
const weatherTool = new DynamicStructuredTool({
  name: "get_weather",
  description: "查询指定城市的天气信息",
  schema: z.object({
    city: z.string().describe("要查询天气的城市名称"),
  }),
  func: async ({ city }) => {
    console.log(`   🌤️ [get_weather] 查询: ${city}`);
    // 模拟天气数据
    const weatherData = {
      北京: { temp: 8, condition: "晴朗", humidity: 35, wind: "北风3级" },
      上海: { temp: 15, condition: "多云", humidity: 65, wind: "东风2级" },
      深圳: { temp: 25, condition: "阴天", humidity: 80, wind: "南风2级" },
      广州: { temp: 23, condition: "小雨", humidity: 85, wind: "东南风3级" },
      成都: { temp: 12, condition: "阴天", humidity: 70, wind: "微风" },
    };

    const data = weatherData[city] || {
      temp: 20,
      condition: "晴",
      humidity: 50,
      wind: "微风",
    };

    const result = `${city}天气：${data.condition}，温度${data.temp}°C，湿度${data.humidity}%，${data.wind}`;
    console.log(`   🌤️ [get_weather] 结果: ${result}`);
    return result;
  },
});
console.log("   ✅ get_weather - 天气查询");

// 工具 3: 备忘录（演示记忆与工具配合）
const notesStore = {}; // 简单的内存存储
const notesTool = new DynamicStructuredTool({
  name: "notes",
  description:
    "管理用户的备忘录。可以保存、读取或列出备忘录。操作类型：save（保存）、get（读取）、list（列出所有）",
  schema: z.object({
    action: z.enum(["save", "get", "list"]).describe("操作类型"),
    key: z
      .string()
      .optional()
      .describe("备忘录的标题/键名（save 和 get 时需要）"),
    content: z.string().optional().describe("备忘录内容（仅 save 时需要）"),
  }),
  func: async ({ action, key, content }) => {
    console.log(`   📝 [notes] 操作: ${action}, key: ${key || "N/A"}`);

    switch (action) {
      case "save":
        if (!key || !content) return "错误：保存备忘录需要提供 key 和 content";
        notesStore[key] = content;
        return `备忘录「${key}」已保存`;

      case "get":
        if (!key) return "错误：读取备忘录需要提供 key";
        return notesStore[key] || `备忘录「${key}」不存在`;

      case "list":
        const keys = Object.keys(notesStore);
        if (keys.length === 0) return "暂无备忘录";
        return `当前备忘录列表：\n${keys
          .map((k) => `- ${k}: ${notesStore[k]}`)
          .join("\n")}`;

      default:
        return "未知操作";
    }
  },
});
console.log("   ✅ notes - 备忘录管理\n");

const tools = [calculatorTool, weatherTool, notesTool];

// ============================================
// 第三步：创建 LLM 并绑定工具
// ============================================

const llm = new ChatDeepSeek({
  model: "deepseek-chat",
  temperature: 0, // Agent 需要更确定性的输出
});

const llmWithTools = llm.bindTools(tools);

console.log("✅ 第三步：LLM 已绑定工具\n");

// ============================================
// 第四步：定义状态
// ============================================

const AgentState = Annotation.Root({
  messages: Annotation({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
});

console.log("✅ 第四步：定义 Agent 状态\n");

// ============================================
// 第五步：定义节点
// ============================================

// Agent 节点：调用 LLM 做决策
async function agentNode(state) {
  console.log(`   [Agent] 当前消息数: ${state.messages.length}`);

  // 系统提示
  const systemMessage = new SystemMessage(
    `你是一个智能助手，可以使用工具来帮助用户完成任务。

你有以下工具：
1. calculator - 数学计算
2. get_weather - 天气查询
3. notes - 备忘录管理（save/get/list）

重要提示：
- 记住用户之前告诉你的信息（名字、偏好等）
- 如果用户之前查询过某个城市的天气，再次提到时可以引用之前的结果
- 合理使用备忘录功能帮用户记录重要信息
- 如果不需要使用工具，直接回答即可`
  );

  const response = await llmWithTools.invoke([
    systemMessage,
    ...state.messages,
  ]);

  if (response.tool_calls && response.tool_calls.length > 0) {
    console.log(
      `   [Agent] → 决定调用工具: ${response.tool_calls
        .map((t) => t.name)
        .join(", ")}`
    );
  } else {
    console.log(`   [Agent] → 直接回答`);
  }

  return { messages: [response] };
}

// 使用内置 ToolNode
const toolNode = new ToolNode(tools);

console.log("✅ 第五步：定义 Agent 和 Tool 节点\n");

// ============================================
// 第六步：定义路由
// ============================================

function shouldCallTools(state) {
  const lastMessage = state.messages[state.messages.length - 1];

  if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
    return "tools";
  }
  return "end";
}

console.log("✅ 第六步：定义路由函数\n");

// ============================================
// 第七步：构建并编译图
// ============================================

const agent = new StateGraph(AgentState)
  .addNode("agent", agentNode)
  .addNode("tools", toolNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldCallTools, {
    tools: "tools",
    end: END,
  })
  .addEdge("tools", "agent")
  .compile({
    checkpointer: memory, // 关键：添加记忆功能！
  });

console.log("✅ 第七步：构建并编译 Agent（带记忆）\n");
console.log("   流程图:");
console.log("   START → agent → [检查] → tools → agent → ...");
console.log("                       ↓");
console.log("                      END\n");

// ============================================
// 演示：带记忆的 Agent 对话
// ============================================

async function chat(threadId, message) {
  const config = { configurable: { thread_id: threadId } };

  console.log("-".repeat(50));
  console.log(`👤 用户: ${message}\n`);

  const result = await agent.invoke(
    { messages: [new HumanMessage(message)] },
    config
  );

  // 获取最后一条 AI 消息
  const aiResponse = result.messages[result.messages.length - 1];
  console.log(`\n🤖 AI: ${aiResponse.content}\n`);

  return aiResponse.content;
}

async function runDemo() {
  console.log("=".repeat(60));
  console.log("📺 演示：带记忆的 ReAct Agent 多轮对话\n");

  const threadId = "agent_demo_001";

  // 演示对话
  const conversations = [
    // 基本介绍
    "你好，我叫小明",

    // 使用计算器工具
    "帮我计算 125 * 8",

    // 使用天气工具
    "北京今天天气怎么样？",

    // 使用备忘录工具
    "帮我记一下：明天下午 3 点开会",

    // 测试记忆 - 引用之前的计算结果
    "刚才计算的结果再除以 5 是多少？",

    // 测试记忆 - 引用之前的天气
    "北京比深圳冷多少度？（先查一下深圳天气）",

    // 测试记忆 - 读取备忘录
    "我有什么备忘录？",

    // 测试记忆 - 询问名字
    "你还记得我叫什么吗？",
  ];

  for (let i = 0; i < conversations.length; i++) {
    console.log("═".repeat(60));
    console.log(`📝 第 ${i + 1} 轮对话`);

    await chat(threadId, conversations[i]);

    // 添加延迟
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // 显示统计信息
  console.log("═".repeat(60));
  console.log("\n📊 对话统计:\n");

  const state = await agent.getState({
    configurable: { thread_id: threadId },
  });

  console.log(`   总消息数: ${state.values.messages.length}`);

  // 统计消息类型
  let humanCount = 0;
  let aiCount = 0;
  let toolCount = 0;

  for (const msg of state.values.messages) {
    if (msg.constructor.name === "HumanMessage") humanCount++;
    else if (msg.constructor.name === "AIMessage") aiCount++;
    else if (msg.constructor.name === "ToolMessage") toolCount++;
  }

  console.log(`   用户消息: ${humanCount}`);
  console.log(`   AI 消息: ${aiCount}`);
  console.log(`   工具消息: ${toolCount}`);
}

// ============================================
// 主程序
// ============================================

async function main() {
  await runDemo();

  console.log("\n═".repeat(60));
  console.log("💡 重点理解:\n");
  console.log("   1️⃣  MemorySaver 让 Agent 记住之前的对话");
  console.log("   2️⃣  Agent 可以引用之前的工具调用结果");
  console.log("   3️⃣  Agent 能记住用户信息（如名字）");
  console.log("   4️⃣  复杂任务可以分多轮完成，Agent 理解上下文\n");

  console.log("🎯 动手练习:\n");
  console.log("   1. 添加一个「翻译」工具");
  console.log("   2. 让 Agent 记住用户的语言偏好");
  console.log("   3. 实现「待办事项」工具，支持增删改查");
  console.log("   4. 尝试更复杂的多轮任务场景\n");
}

main().catch(console.error);
