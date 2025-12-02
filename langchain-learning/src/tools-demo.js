/**
 * LangChain Tools 学习 Demo
 *
 * 本示例演示如何：
 * 1. 创建自定义 Tool
 * 2. 使用内置工具（计算器）
 * 3. 让 AI 自动选择和调用工具
 * 4. 实现多工具协作
 */

import { ChatDeepSeek } from "@langchain/deepseek";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import "dotenv/config";

// ============================================
// 示例 1: 创建简单的自定义工具
// ============================================

console.log("========== 示例 1: 创建简单的天气查询工具 ==========\n");

// 定义一个查询天气的工具
const weatherTool = new DynamicStructuredTool({
  name: "get_weather",
  description: "获取指定城市的天气信息。当用户询问天气时使用此工具。",

  // 定义工具的输入参数 Schema
  schema: z.object({
    city: z.string().describe("城市名称，例如：北京、上海、深圳"),
    unit: z.enum(["celsius", "fahrenheit"]).optional().describe("温度单位"),
  }),

  // 工具的实际执行逻辑
  func: async ({ city, unit = "celsius" }) => {
    console.log(
      `[工具调用] get_weather 被调用，参数: city="${city}", unit="${unit}"`
    );

    // 模拟查询天气（实际应用中这里会调用真实的天气 API）
    const weatherData = {
      北京: { temp: 15, condition: "晴朗", humidity: 45 },
      上海: { temp: 20, condition: "多云", humidity: 65 },
      深圳: { temp: 28, condition: "小雨", humidity: 80 },
    };

    const data = weatherData[city] || {
      temp: 22,
      condition: "未知",
      humidity: 50,
    };

    // 转换温度单位
    const temp =
      unit === "fahrenheit" ? ((data.temp * 9) / 5 + 32).toFixed(1) : data.temp;
    const unitSymbol = unit === "fahrenheit" ? "°F" : "°C";

    return JSON.stringify({
      city: city,
      temperature: `${temp}${unitSymbol}`,
      condition: data.condition,
      humidity: `${data.humidity}%`,
    });
  },
});

// 测试工具直接调用
const weatherResult = await weatherTool.invoke({ city: "北京" });
console.log("直接调用工具结果:", weatherResult);
console.log("\n");

// ============================================
// 示例 2: 创建多个工具并让 AI 自动选择
// ============================================

console.log("========== 示例 2: 多工具协作 - AI 自动选择工具 ==========\n");

// 工具 1: 计算器
const calculatorTool = new DynamicStructuredTool({
  name: "calculator",
  description:
    "执行数学计算。支持加减乘除、幂运算等。输入应该是一个数学表达式字符串。",
  schema: z.object({
    expression: z
      .string()
      .describe("数学表达式，例如: '2 + 3 * 4' 或 '10 ** 2'"),
  }),
  func: async ({ expression }) => {
    console.log(`[工具调用] calculator 被调用，计算: ${expression}`);
    try {
      // 安全的计算方式（生产环境应使用 math.js 等库）
      const result = Function(`"use strict"; return (${expression})`)();
      return `计算结果: ${expression} = ${result}`;
    } catch (error) {
      return `计算错误: ${error.message}`;
    }
  },
});

// 工具 2: 获取当前时间
const timeTool = new DynamicStructuredTool({
  name: "get_current_time",
  description: "获取当前的日期和时间。当用户询问现在几点、今天日期时使用。",
  schema: z.object({
    timezone: z.string().optional().describe("时区，例如: 'Asia/Shanghai'"),
  }),
  func: async ({ timezone = "Asia/Shanghai" }) => {
    console.log(`[工具调用] get_current_time 被调用，时区: ${timezone}`);
    const now = new Date();
    return `当前时间: ${now.toLocaleString("zh-CN", { timeZone: timezone })}`;
  },
});

// 工具 3: 搜索引擎模拟
const searchTool = new DynamicStructuredTool({
  name: "web_search",
  description:
    "在互联网上搜索信息。当用户询问最新资讯、实时信息或你不知道的知识时使用。",
  schema: z.object({
    query: z.string().describe("搜索关键词"),
  }),
  func: async ({ query }) => {
    console.log(`[工具调用] web_search 被调用，搜索: "${query}"`);

    // 模拟搜索结果（实际应用中这里会调用真实的搜索 API）
    const mockResults = {
      LangChain:
        "LangChain 是一个用于开发由大语言模型驱动的应用程序的框架，支持多种 AI 模型集成。",
      "Node.js":
        "Node.js 是一个基于 Chrome V8 引擎的 JavaScript 运行时环境，用于构建高性能的服务器端应用。",
      default: `关于 "${query}" 的搜索结果：这是一个模拟的搜索结果。实际应用中会返回真实的网络搜索数据。`,
    };

    return mockResults[query] || mockResults["default"];
  },
});

// 工具 4: 文本翻译
const translateTool = new DynamicStructuredTool({
  name: "translate_text",
  description: "将文本从一种语言翻译成另一种语言。",
  schema: z.object({
    text: z.string().describe("需要翻译的文本"),
    source_lang: z.string().describe("源语言，例如: 'English', 'Chinese'"),
    target_lang: z.string().describe("目标语言，例如: 'Chinese', 'English'"),
  }),
  func: async ({ text, source_lang, target_lang }) => {
    console.log(
      `[工具调用] translate_text 被调用: ${source_lang} → ${target_lang}`
    );

    // 这里实际上应该调用翻译 API，为了演示我们返回模拟结果
    const mockTranslations = {
      Hello: "你好",
      "Thank you": "谢谢",
      "Good morning": "早上好",
    };

    return (
      mockTranslations[text] ||
      `[翻译] ${text} (${source_lang} → ${target_lang})`
    );
  },
});

// ============================================
// 示例 3: 将工具绑定到 LLM，让 AI 自动调用
// ============================================

console.log("========== 示例 3: AI 自动选择并调用工具 ==========\n");

// 初始化 LLM
const llm = new ChatDeepSeek({
  model: "deepseek-chat",
  temperature: 0,
});

// 将所有工具绑定到 LLM
const tools = [
  weatherTool,
  calculatorTool,
  timeTool,
  searchTool,
  translateTool,
];
const llmWithTools = llm.bindTools(tools);

// 测试 1: AI 自动选择天气工具
console.log("🤔 用户提问: 北京今天天气怎么样？\n");

const response1 = await llmWithTools.invoke("北京今天天气怎么样？");

console.log("AI 的响应:", response1);

// 检查 AI 是否请求调用工具
if (response1.tool_calls && response1.tool_calls.length > 0) {
  console.log("\n✅ AI 决定调用工具:");
  for (const toolCall of response1.tool_calls) {
    console.log(`  - 工具名称: ${toolCall.name}`);
    console.log(`  - 参数:`, toolCall.args);

    // 实际执行工具调用
    const tool = tools.find((t) => t.name === toolCall.name);
    if (tool) {
      const result = await tool.invoke(toolCall.args);
      console.log(`  - 工具返回:`, result);
    }
  }
}

console.log("\n" + "=".repeat(60) + "\n");

// 测试 2: AI 自动选择计算器工具
console.log("🤔 用户提问: 请帮我计算 123 * 456 等于多少？\n");

const response2 = await llmWithTools.invoke("请帮我计算 123 * 456 等于多少？");

if (response2.tool_calls && response2.tool_calls.length > 0) {
  console.log("✅ AI 决定调用工具:");
  for (const toolCall of response2.tool_calls) {
    console.log(`  - 工具名称: ${toolCall.name}`);
    console.log(`  - 参数:`, toolCall.args);

    const tool = tools.find((t) => t.name === toolCall.name);
    if (tool) {
      const result = await tool.invoke(toolCall.args);
      console.log(`  - 工具返回:`, result);
    }
  }
}

console.log("\n" + "=".repeat(60) + "\n");

// 测试 3: 普通对话（不需要工具）
console.log("🤔 用户提问: 你好，介绍一下你自己\n");

const response3 = await llmWithTools.invoke("你好，介绍一下你自己");

if (response3.tool_calls && response3.tool_calls.length > 0) {
  console.log("✅ AI 决定调用工具");
} else {
  console.log("✅ AI 直接回答（无需工具）:");
  console.log(response3.content);
}

console.log("\n" + "=".repeat(60) + "\n");

// ============================================
// 示例 4: 完整的工具调用循环（手动实现）
// ============================================

console.log("========== 示例 4: 完整的工具调用循环 ==========\n");

import { HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import { TavilySearch } from "@langchain/tavily";

/**
 * 完整的工具调用流程：
 * 1. 用户提问
 * 2. AI 分析并返回 tool_calls
 * 3. 执行工具调用
 * 4. 将工具结果作为 ToolMessage 传回 AI
 * 5. AI 根据工具结果生成最终回答
 */
async function chatWithTools(question) {
  console.log(`🤔 用户: ${question}\n`);

  // 第 1 步：将用户问题发送给 AI
  const messages = [new HumanMessage(question)];
  const aiResponse = await llmWithTools.invoke(messages);

  // 第 2 步：检查 AI 是否需要调用工具
  if (aiResponse.tool_calls && aiResponse.tool_calls.length > 0) {
    console.log("🔧 AI 决定调用以下工具:");

    // 保存 AI 的响应（包含 tool_calls）
    messages.push(aiResponse);

    // 第 3 步：执行每个工具调用
    for (const toolCall of aiResponse.tool_calls) {
      console.log(`  - 工具: ${toolCall.name}`);
      console.log(`    参数:`, toolCall.args);

      const tool = tools.find((t) => t.name === toolCall.name);
      if (tool) {
        const result = await tool.invoke(toolCall.args);
        console.log(`    结果:`, result);

        // 第 4 步：将工具结果作为 ToolMessage 添加到消息列表
        messages.push(
          new ToolMessage({
            tool_call_id: toolCall.id,
            content: result,
          })
        );
      }
    }

    // 第 5 步：将所有消息（包括工具结果）发送给 AI，获取最终回答
    console.log("\n📝 AI 整合工具结果...\n");
    const finalResponse = await llmWithTools.invoke(messages);
    console.log("✅ AI 最终回答:", finalResponse.content);

    return finalResponse.content;
  } else {
    // AI 直接回答，无需工具
    console.log("✅ AI 直接回答:", aiResponse.content);
    return aiResponse.content;
  }
}

// 测试完整的工具调用流程
await chatWithTools("上海今天天气怎么样？请用中文回答。");

console.log("\n" + "=".repeat(60) + "\n");

// 测试多工具调用
await chatWithTools("现在几点了？");

console.log("\n" + "=".repeat(60) + "\n");

// ============================================
// 示例 5: 使用 LangChain 内置工具 - TavilySearch
// ============================================

console.log("========== 示例 5: TavilySearch 真实搜索工具 ==========\n");

/**
 * TavilySearch 是 LangChain 官方推荐的搜索工具
 *
 * 特点：
 * 1. 专为 AI Agent 设计的搜索引擎
 * 2. 返回结构化的搜索结果
 * 3. 支持多种搜索模式（general, news 等）
 * 4. 免费 tier 每月 1000 次调用
 *
 * 获取 API Key: https://tavily.com/
 */

// 检查是否配置了 Tavily API Key
if (process.env.TAVILY_API_KEY) {
  console.log("✅ 检测到 TAVILY_API_KEY，开始演示 TavilySearch...\n");

  // 方式 1: 直接使用 TavilySearch 工具
  const tavilyTool = new TavilySearch({
    maxResults: 3, // 返回结果数量
    // topic: "general", // 可选: "general" | "news"
    // includeAnswer: true, // 可选: 是否包含 AI 生成的摘要答案
    // includeRawContent: false, // 可选: 是否包含原始网页内容
  });

  console.log("📌 TavilySearch 工具信息:");
  console.log(`   名称: ${tavilyTool.name}`);
  console.log(`   描述: ${tavilyTool.description}\n`);

  // 直接调用工具测试
  console.log("🔍 测试 1: 直接调用 TavilySearch\n");
  try {
    // 注意：TavilySearch 需要传入对象格式 { query: "..." }
    const searchResult = await tavilyTool.invoke({
      query: "LangChain 最新版本特性",
    });
    console.log(
      "搜索结果:",
      JSON.stringify(searchResult, null, 2).substring(0, 500) + "..."
    );
  } catch (error) {
    console.log("搜索出错:", error.message);
  }

  console.log("\n" + "-".repeat(60) + "\n");

  // 方式 2: 将 TavilySearch 与其他工具一起绑定到 LLM
  console.log("🔍 测试 2: 将 TavilySearch 绑定到 LLM，AI 自动调用\n");

  const toolsWithTavily = [tavilyTool, calculatorTool, timeTool];
  const llmWithTavily = llm.bindTools(toolsWithTavily);

  // 使用完整的工具调用流程
  async function chatWithTavily(question) {
    console.log(`🤔 用户: ${question}\n`);

    const messages = [new HumanMessage(question)];
    const aiResponse = await llmWithTavily.invoke(messages);

    if (aiResponse.tool_calls && aiResponse.tool_calls.length > 0) {
      console.log("🔧 AI 决定调用工具:");
      messages.push(aiResponse);

      for (const toolCall of aiResponse.tool_calls) {
        console.log(`  - 工具: ${toolCall.name}`);
        console.log(`    参数:`, toolCall.args);

        const tool = toolsWithTavily.find((t) => t.name === toolCall.name);
        if (tool) {
          const result = await tool.invoke(toolCall.args);
          // TavilySearch 返回对象，需要转换为字符串
          const resultStr =
            typeof result === "string" ? result : JSON.stringify(result);
          // 截断过长的搜索结果以便显示
          const displayResult =
            resultStr.length > 500
              ? resultStr.substring(0, 500) + "..."
              : resultStr;
          console.log(`    结果:`, displayResult);

          messages.push(
            new ToolMessage({
              tool_call_id: toolCall.id,
              content: resultStr, // ToolMessage 的 content 必须是字符串
            })
          );
        }
      }

      console.log("\n📝 AI 整合搜索结果...\n");
      const finalResponse = await llmWithTavily.invoke(messages);
      console.log("✅ AI 最终回答:", finalResponse.content);
      return finalResponse.content;
    } else {
      console.log("✅ AI 直接回答:", aiResponse.content);
      return aiResponse.content;
    }
  }

  // 测试真实搜索场景
  await chatWithTavily("2024年 AI 领域有哪些重大突破？请简要总结。");
} else {
  console.log("⚠️  未检测到 TAVILY_API_KEY 环境变量");
  console.log("   TavilySearch 是 LangChain 官方推荐的搜索工具\n");
  console.log("📋 如何获取 Tavily API Key:");
  console.log("   1. 访问 https://tavily.com/");
  console.log("   2. 注册账号（支持 GitHub/Google 登录）");
  console.log("   3. 在 Dashboard 中复制 API Key");
  console.log("   4. 在 .env 文件中添加: TAVILY_API_KEY=your_api_key\n");
  console.log("💡 免费 tier 每月提供 1000 次搜索调用，足够学习使用！\n");

  // 展示工具的基本结构（无需 API Key）
  console.log("📌 TavilySearch 工具的创建方式:\n");
  console.log(`
const tavilyTool = new TavilySearch({
  maxResults: 3,        // 返回结果数量
  topic: "general",     // 搜索主题: "general" | "news"
  includeAnswer: true,  // 是否包含 AI 摘要
});

// 直接调用
const result = await tavilyTool.invoke("搜索关键词");

// 绑定到 LLM
const llmWithSearch = llm.bindTools([tavilyTool]);
`);
}

console.log("\n" + "=".repeat(60) + "\n");

// ============================================
// 知识点总结
// ============================================

console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    📚 LangChain Tools 知识点总结                ║
╚════════════════════════════════════════════════════════════════╝

✨ 核心概念
─────────────────────────────────────────────────────────────────
1. Tool: 封装的函数，让 AI 能够执行特定任务
2. DynamicStructuredTool: 使用 Zod Schema 定义工具参数的 Tool 类
3. bindTools(): 将工具绑定到 LLM，让 AI 知道可以调用哪些工具
4. ToolMessage: 将工具执行结果返回给 AI 的消息类型

🛠️ 工具的三要素
─────────────────────────────────────────────────────────────────
• name: 工具名称（AI 用来识别工具）
• description: 工具描述（告诉 AI 什么时候使用这个工具）
• schema: 参数定义（定义工具需要什么输入）
• func: 执行函数（工具的实际逻辑）

🎯 使用场景
─────────────────────────────────────────────────────────────────
✅ 数据查询: 查天气、查快递、查数据库
✅ 计算任务: 数学计算、单位转换、数据分析
✅ API 调用: 调用第三方服务、发送请求
✅ 文件操作: 读写文件、处理文档
✅ 搜索引擎: 获取实时信息

💡 最佳实践
─────────────────────────────────────────────────────────────────
1. 工具描述要清晰：让 AI 知道什么时候使用这个工具
2. 参数要有 describe：帮助 AI 理解每个参数的含义
3. 错误处理：工具内部要处理异常情况
4. 返回格式统一：建议返回 JSON 字符串或纯文本
5. 使用 ToolMessage：将工具结果正确传回 AI

🔗 工具调用流程
─────────────────────────────────────────────────────────────────
用户输入 → AI 分析任务 → 选择合适的工具 → 调用工具 
    → 获取结果 → AI 整合答案 → 返回给用户

🔌 LangChain 内置工具
─────────────────────────────────────────────────────────────────
• TavilySearch: 专为 AI 设计的搜索引擎（推荐）
• Calculator: 数学计算工具
• WebBrowser: 网页浏览工具
• 更多工具: https://js.langchain.com/docs/integrations/tools

🚀 进阶方向
─────────────────────────────────────────────────────────────────
• 使用 TavilySearch 获取实时互联网信息
• 实现工具的错误重试机制
• 创建工具的组合和链式调用
• 使用 Memory 保存多轮对话上下文
• 学习 LangGraph 实现更复杂的 Agent 流程

╚════════════════════════════════════════════════════════════════╝
`);

console.log("\n✅ Demo 运行完成！");
console.log("💡 下一步建议：");
console.log("  1. 配置 TAVILY_API_KEY，体验真实的互联网搜索能力");
console.log("  2. 修改工具的 description，观察 AI 的选择是否改变");
console.log("  3. 创建自己的工具（如：查询数据库、发送邮件）");
console.log("  4. 尝试更复杂的问题，测试 AI 的多工具协作能力");
console.log("  5. 学习 @langchain/langgraph 实现更智能的 Agent");
console.log(
  "\n📚 推荐使用 Trae 编辑器运行和调试本示例，获得更好的开发体验！\n"
);
