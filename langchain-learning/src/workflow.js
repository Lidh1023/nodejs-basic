/**
 * LangGraph 工作流学习 Demo
 *
 * 本示例演示如何：
 * 1. 使用 StateGraph 创建工作流
 * 2. 定义节点 (Nodes) 和边 (Edges)
 * 3. 使用条件边 (Conditional Edges) 实现分支逻辑
 * 4. 实现循环流程
 * 5. 构建一个完整的 ReAct Agent
 *
 * 🎯 核心概念：
 * - StateGraph: 状态图，定义工作流的状态和流转逻辑
 * - State: 工作流执行过程中传递的数据
 * - Node: 节点，执行具体的处理逻辑
 * - Edge: 边，定义节点之间的连接关系
 * - Conditional Edge: 条件边，根据状态决定下一步流向
 */

import { ChatDeepSeek } from "@langchain/deepseek";
import { StateGraph, Annotation, END, START } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { z } from "zod";
import "dotenv/config";

// 初始化 LLM
const llm = new ChatDeepSeek({
  model: "deepseek-chat",
  temperature: 0.7,
});

// ============================================
// 示例 1: 最简单的 StateGraph - Hello World
// ============================================

console.log(
  "╔════════════════════════════════════════════════════════════════╗"
);
console.log(
  "║        示例 1: 最简单的 StateGraph - Hello World              ║"
);
console.log(
  "╚════════════════════════════════════════════════════════════════╝\n"
);

/**
 * StateGraph 需要定义一个状态 Schema
 * 使用 Annotation 来定义状态的结构和更新规则
 *
 * 关键概念：
 * - Annotation.Root: 定义状态的根结构
 * - reducer: 定义状态如何更新（可选）
 * - default: 定义默认值
 */

// 定义状态 Schema
const SimpleState = Annotation.Root({
  // 输入文本
  input: Annotation({
    reducer: (_, next) => next, // 直接替换
    default: () => "",
  }),
  // 处理结果
  result: Annotation({
    reducer: (_, next) => next,
    default: () => "",
  }),
});

// 创建一个简单的处理节点
async function greetNode(state) {
  console.log(`[节点 greet] 收到输入: ${state.input}`);
  const greeting = `你好，${state.input}！欢迎学习 LangGraph！`;
  return { result: greeting };
}

// 创建 StateGraph
const simpleGraph = new StateGraph(SimpleState)
  // 添加节点
  .addNode("greet", greetNode)
  // 添加边：START → greet → END
  .addEdge(START, "greet")
  .addEdge("greet", END);

// 编译图
const simpleApp = simpleGraph.compile();

// 运行图
console.log("📌 运行简单的 StateGraph...\n");
const simpleResult = await simpleApp.invoke({ input: "小明" });
console.log("结果:", simpleResult.result);
console.log("\n" + "─".repeat(60) + "\n");

// ============================================
// 示例 2: 多节点串行工作流
// ============================================

console.log(
  "╔════════════════════════════════════════════════════════════════╗"
);
console.log(
  "║            示例 2: 多节点串行工作流                            ║"
);
console.log(
  "╚════════════════════════════════════════════════════════════════╝\n"
);

/**
 * 场景：内容创作流水线
 * 1. 生成标题
 * 2. 生成内容
 * 3. 生成摘要
 */

// 定义状态
const ContentState = Annotation.Root({
  topic: Annotation({
    reducer: (_, next) => next,
    default: () => "",
  }),
  title: Annotation({
    reducer: (_, next) => next,
    default: () => "",
  }),
  content: Annotation({
    reducer: (_, next) => next,
    default: () => "",
  }),
  summary: Annotation({
    reducer: (_, next) => next,
    default: () => "",
  }),
});

// 节点 1: 生成标题
async function generateTitle(state) {
  console.log(`[节点 generateTitle] 主题: ${state.topic}`);
  const response = await llm.invoke([
    new HumanMessage(
      `请为主题"${state.topic}"生成一个吸引人的标题，只输出标题本身，不要其他内容。`
    ),
  ]);
  const title = response.content.trim();
  console.log(`[节点 generateTitle] 生成标题: ${title}`);
  return { title };
}

// 节点 2: 生成内容
async function generateContent(state) {
  console.log(`[节点 generateContent] 标题: ${state.title}`);
  const response = await llm.invoke([
    new HumanMessage(`请根据标题"${state.title}"写一段 100 字左右的内容。`),
  ]);
  const content = response.content.trim();
  console.log(`[节点 generateContent] 内容生成完成`);
  return { content };
}

// 节点 3: 生成摘要
async function generateSummary(state) {
  console.log(`[节点 generateSummary] 生成摘要...`);
  const response = await llm.invoke([
    new HumanMessage(`请用一句话总结以下内容：\n${state.content}`),
  ]);
  const summary = response.content.trim();
  console.log(`[节点 generateSummary] 摘要: ${summary}`);
  return { summary };
}

// 构建工作流
const contentGraph = new StateGraph(ContentState)
  .addNode("generateTitle", generateTitle)
  .addNode("generateContent", generateContent)
  .addNode("generateSummary", generateSummary)
  // 定义执行顺序
  .addEdge(START, "generateTitle")
  .addEdge("generateTitle", "generateContent")
  .addEdge("generateContent", "generateSummary")
  .addEdge("generateSummary", END);

const contentApp = contentGraph.compile();

console.log("📌 运行内容创作流水线...\n");
const contentResult = await contentApp.invoke({ topic: "AI 编程助手的未来" });

console.log("\n📊 最终结果:");
console.log("─".repeat(40));
console.log("📌 标题:", contentResult.title);
console.log("📄 内容:", contentResult.content);
console.log("📋 摘要:", contentResult.summary);
console.log("─".repeat(40));
console.log("\n" + "─".repeat(60) + "\n");

// ============================================
// 示例 3: 条件分支 - Conditional Edges
// ============================================

console.log(
  "╔════════════════════════════════════════════════════════════════╗"
);
console.log(
  "║          示例 3: 条件分支 - Conditional Edges                  ║"
);
console.log(
  "╚════════════════════════════════════════════════════════════════╝\n"
);

/**
 * 场景：情感分析后的条件路由
 * - 积极情感 → 生成鼓励回复
 * - 消极情感 → 生成安慰回复
 * - 中性情感 → 生成普通回复
 */

// 定义状态
const SentimentState = Annotation.Root({
  text: Annotation({
    reducer: (_, next) => next,
    default: () => "",
  }),
  sentiment: Annotation({
    reducer: (_, next) => next,
    default: () => "",
  }),
  response: Annotation({
    reducer: (_, next) => next,
    default: () => "",
  }),
});

// 节点: 情感分析
async function analyzeSentiment(state) {
  console.log(`[节点 analyzeSentiment] 分析文本: ${state.text}`);
  const response = await llm.invoke([
    new HumanMessage(
      `分析以下文本的情感倾向，只输出一个词：积极、消极 或 中性。\n文本：${state.text}`
    ),
  ]);
  const sentiment = response.content.trim();
  console.log(`[节点 analyzeSentiment] 情感: ${sentiment}`);
  return { sentiment };
}

// 节点: 积极回复
async function positiveResponse(state) {
  console.log(`[节点 positiveResponse] 生成积极回复...`);
  const response = await llm.invoke([
    new HumanMessage(
      `用户说："${state.text}"。这是积极的情感，请生成一个鼓励性的回复，20字以内。`
    ),
  ]);
  return { response: `😊 ${response.content.trim()}` };
}

// 节点: 消极回复
async function negativeResponse(state) {
  console.log(`[节点 negativeResponse] 生成安慰回复...`);
  const response = await llm.invoke([
    new HumanMessage(
      `用户说："${state.text}"。这是消极的情感，请生成一个安慰性的回复，20字以内。`
    ),
  ]);
  return { response: `💪 ${response.content.trim()}` };
}

// 节点: 中性回复
async function neutralResponse(state) {
  console.log(`[节点 neutralResponse] 生成普通回复...`);
  const response = await llm.invoke([
    new HumanMessage(
      `用户说："${state.text}"。请生成一个友好的回复，20字以内。`
    ),
  ]);
  return { response: `👋 ${response.content.trim()}` };
}

// 路由函数：根据情感决定下一步
function routeBySentiment(state) {
  console.log(`[路由] 根据情感 "${state.sentiment}" 选择路径...`);
  if (state.sentiment.includes("积极")) {
    return "positive";
  } else if (state.sentiment.includes("消极")) {
    return "negative";
  } else {
    return "neutral";
  }
}

// 构建工作流
const sentimentGraph = new StateGraph(SentimentState)
  .addNode("analyze", analyzeSentiment)
  .addNode("positive", positiveResponse)
  .addNode("negative", negativeResponse)
  .addNode("neutral", neutralResponse)
  // START → analyze
  .addEdge(START, "analyze")
  // analyze → 条件分支
  .addConditionalEdges("analyze", routeBySentiment, {
    positive: "positive",
    negative: "negative",
    neutral: "neutral",
  })
  // 所有分支 → END
  .addEdge("positive", END)
  .addEdge("negative", END)
  .addEdge("neutral", END);

const sentimentApp = sentimentGraph.compile();

// 测试不同情感
const testTexts = [
  "今天学会了新技能，太开心了！",
  "工作压力好大，感觉快撑不住了...",
  "明天天气怎么样？",
];

console.log("📌 测试条件分支路由...\n");

for (const text of testTexts) {
  console.log(`📝 输入: "${text}"`);
  const result = await sentimentApp.invoke({ text });
  console.log(`💬 回复: ${result.response}`);
  console.log("─".repeat(40));
}

console.log("\n" + "─".repeat(60) + "\n");

// ============================================
// 示例 4: 循环流程 - 迭代优化
// ============================================

console.log(
  "╔════════════════════════════════════════════════════════════════╗"
);
console.log(
  "║            示例 4: 循环流程 - 迭代优化                         ║"
);
console.log(
  "╚════════════════════════════════════════════════════════════════╝\n"
);

/**
 * 场景：代码审查循环
 * 1. 生成代码
 * 2. 审查代码
 * 3. 如果有问题 → 改进代码 → 重新审查
 * 4. 如果通过 → 结束
 *
 * 这展示了 LangGraph 的循环能力
 */

// 定义状态
const CodeReviewState = Annotation.Root({
  requirement: Annotation({
    reducer: (_, next) => next,
    default: () => "",
  }),
  code: Annotation({
    reducer: (_, next) => next,
    default: () => "",
  }),
  feedback: Annotation({
    reducer: (_, next) => next,
    default: () => "",
  }),
  isApproved: Annotation({
    reducer: (_, next) => next,
    default: () => false,
  }),
  iteration: Annotation({
    reducer: (_, next) => next,
    default: () => 0,
  }),
});

// 节点: 生成代码
async function generateCode(state) {
  const iteration = state.iteration + 1;
  console.log(`[节点 generateCode] 第 ${iteration} 次迭代`);

  let prompt;
  if (state.feedback) {
    prompt = `根据以下反馈改进代码：
反馈：${state.feedback}
当前代码：${state.code}
请直接输出改进后的代码，不要解释。`;
  } else {
    prompt = `请用 JavaScript 实现以下需求，只输出代码：
${state.requirement}`;
  }

  const response = await llm.invoke([new HumanMessage(prompt)]);
  const code = response.content.trim();
  console.log(`[节点 generateCode] 代码已生成`);
  return { code, iteration };
}

// 节点: 审查代码
async function reviewCode(state) {
  console.log(`[节点 reviewCode] 审查代码...`);

  const response = await llm.invoke([
    new HumanMessage(
      `审查以下代码，判断是否符合要求且代码质量良好。
需求：${state.requirement}
代码：${state.code}

请按以下格式回复：
状态：通过 或 需要改进
反馈：（如果需要改进，说明问题，20字以内）`
    ),
  ]);

  const result = response.content.trim();
  const isApproved = result.includes("通过") && !result.includes("需要改进");
  const feedbackMatch = result.match(/反馈[：:]\s*(.+)/);
  const feedback = feedbackMatch ? feedbackMatch[1] : "";

  console.log(
    `[节点 reviewCode] 状态: ${isApproved ? "✅ 通过" : "❌ 需改进"}`
  );
  if (!isApproved) {
    console.log(`[节点 reviewCode] 反馈: ${feedback}`);
  }

  return { isApproved, feedback };
}

// 路由函数：决定继续还是结束
function shouldContinue(state) {
  // 最多迭代 3 次，防止无限循环
  if (state.iteration >= 3) {
    console.log(`[路由] 达到最大迭代次数，强制结束`);
    return "end";
  }
  if (state.isApproved) {
    console.log(`[路由] 代码通过审查，结束`);
    return "end";
  }
  console.log(`[路由] 需要改进，继续迭代`);
  return "continue";
}

// 构建工作流
const codeReviewGraph = new StateGraph(CodeReviewState)
  .addNode("generate", generateCode)
  .addNode("review", reviewCode)
  .addEdge(START, "generate")
  .addEdge("generate", "review")
  .addConditionalEdges("review", shouldContinue, {
    continue: "generate", // 循环回到生成节点
    end: END,
  });

const codeReviewApp = codeReviewGraph.compile();

console.log("📌 运行代码审查循环...\n");
const codeResult = await codeReviewApp.invoke({
  requirement: "写一个函数，计算数组中所有数字的平均值",
});

console.log("\n📊 最终结果:");
console.log("─".repeat(40));
console.log(`迭代次数: ${codeResult.iteration}`);
console.log(`审查状态: ${codeResult.isApproved ? "✅ 通过" : "❌ 未通过"}`);
console.log("最终代码:");
console.log(codeResult.code);
console.log("─".repeat(40));
console.log("\n" + "─".repeat(60) + "\n");

// ============================================
// 示例 5: ReAct Agent - 工具调用循环
// ============================================

console.log(
  "╔════════════════════════════════════════════════════════════════╗"
);
console.log(
  "║          示例 5: ReAct Agent - 工具调用循环                    ║"
);
console.log(
  "╚════════════════════════════════════════════════════════════════╝\n"
);

/**
 * ReAct (Reasoning + Acting) 模式：
 * 1. 推理：AI 分析问题，决定是否需要调用工具
 * 2. 行动：调用工具获取信息
 * 3. 观察：获取工具结果
 * 4. 循环：直到可以给出最终答案
 *
 * 这是 LangGraph 最经典的使用场景
 */

// 定义工具
const calculatorTool = new DynamicStructuredTool({
  name: "calculator",
  description: "执行数学计算，输入数学表达式，返回计算结果",
  schema: z.object({
    expression: z.string().describe("数学表达式，如: 2 + 3 * 4"),
  }),
  func: async ({ expression }) => {
    console.log(`  🔧 [工具 calculator] 计算: ${expression}`);
    try {
      const result = Function(`"use strict"; return (${expression})`)();
      return `${expression} = ${result}`;
    } catch (error) {
      return `计算错误: ${error.message}`;
    }
  },
});

const weatherTool = new DynamicStructuredTool({
  name: "get_weather",
  description: "获取城市天气信息",
  schema: z.object({
    city: z.string().describe("城市名称"),
  }),
  func: async ({ city }) => {
    console.log(`  🔧 [工具 get_weather] 查询: ${city}`);
    // 模拟天气数据
    const weatherData = {
      北京: "晴天，15°C",
      上海: "多云，20°C",
      深圳: "小雨，28°C",
    };
    return weatherData[city] || `${city}：晴天，22°C`;
  },
});

const searchTool = new DynamicStructuredTool({
  name: "search",
  description: "搜索信息，用于查询实时数据或不确定的知识",
  schema: z.object({
    query: z.string().describe("搜索关键词"),
  }),
  func: async ({ query }) => {
    console.log(`  🔧 [工具 search] 搜索: ${query}`);
    // 模拟搜索结果
    return `关于"${query}"的搜索结果：这是一个模拟的搜索结果，实际应用中会调用真实的搜索API。`;
  },
});

const tools = [calculatorTool, weatherTool, searchTool];

// 绑定工具到 LLM
const llmWithTools = llm.bindTools(tools);

// 定义 Agent 状态
// messages 使用特殊的 reducer 来累积消息
const AgentState = Annotation.Root({
  messages: Annotation({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
});

// Agent 节点：调用 LLM 决定下一步
async function agentNode(state) {
  console.log(`[节点 agent] 分析任务...`);
  const response = await llmWithTools.invoke(state.messages);
  console.log(
    `[节点 agent] AI 回复: ${
      response.tool_calls?.length > 0 ? "需要调用工具" : "直接回答"
    }`
  );
  return { messages: [response] };
}

// 工具节点：使用 LangGraph 内置的 ToolNode
const toolNode = new ToolNode(tools);

// 路由函数：决定调用工具还是结束
function shouldCallTools(state) {
  const lastMessage = state.messages[state.messages.length - 1];

  // 检查是否有工具调用
  if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
    console.log(`[路由] 检测到工具调用请求，转到工具节点`);
    return "tools";
  }

  console.log(`[路由] 无工具调用，结束对话`);
  return "end";
}

// 构建 Agent 图
const agentGraph = new StateGraph(AgentState)
  .addNode("agent", agentNode)
  .addNode("tools", toolNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldCallTools, {
    tools: "tools",
    end: END,
  })
  .addEdge("tools", "agent"); // 工具执行完后回到 agent

const agentApp = agentGraph.compile();

// 测试 Agent
console.log("📌 测试 ReAct Agent...\n");

const agentQuestions = [
  "北京今天天气怎么样？",
  "帮我计算 (15 + 27) * 3 等于多少？",
  "你好，介绍一下你自己",
];

for (const question of agentQuestions) {
  console.log(`\n🤔 用户: ${question}`);
  console.log("─".repeat(40));

  const result = await agentApp.invoke({
    messages: [new HumanMessage(question)],
  });

  // 获取最后一条 AI 消息
  const lastAIMessage = result.messages
    .filter(
      (m) => m.constructor.name === "AIMessage" || m._getType?.() === "ai"
    )
    .pop();

  console.log(`\n💬 Agent: ${lastAIMessage.content}`);
  console.log("═".repeat(40));
}

console.log("\n" + "─".repeat(60) + "\n");

// ============================================
// 示例 6: 流式输出
// ============================================

console.log(
  "╔════════════════════════════════════════════════════════════════╗"
);
console.log(
  "║               示例 6: 流式输出 Stream                          ║"
);
console.log(
  "╚════════════════════════════════════════════════════════════════╝\n"
);

/**
 * LangGraph 支持流式输出，可以实时看到：
 * 1. 每个节点的执行过程
 * 2. 状态的变化
 */

console.log("📌 流式执行 Agent...\n");
console.log("🤔 用户: 上海天气怎么样？然后帮我计算 100 / 4");
console.log("─".repeat(40));

// 注意：stream() 需要 await
const streamResult = await agentApp.stream({
  messages: [new HumanMessage("上海天气怎么样？然后帮我计算 100 / 4")],
});

for await (const event of streamResult) {
  // event 的 key 是节点名称，value 是该节点的输出
  for (const [nodeName, output] of Object.entries(event)) {
    console.log(`\n📍 [${nodeName}] 节点执行完成`);
    if (output.messages) {
      const lastMsg = output.messages[output.messages.length - 1];
      if (lastMsg.content) {
        console.log(`   输出: ${lastMsg.content.substring(0, 100)}...`);
      }
      if (lastMsg.tool_calls?.length > 0) {
        console.log(
          `   工具调用: ${lastMsg.tool_calls.map((t) => t.name).join(", ")}`
        );
      }
    }
  }
}

console.log("\n" + "─".repeat(60) + "\n");

// ============================================
// 知识点总结
// ============================================

console.log(`
╔════════════════════════════════════════════════════════════════╗
║              📚 LangGraph 知识点总结                            ║
╚════════════════════════════════════════════════════════════════╝

✨ 核心概念
─────────────────────────────────────────────────────────────────
1. StateGraph: 状态图，工作流的核心结构
   - 定义状态 Schema
   - 添加节点和边
   - 编译后执行

2. Annotation: 定义状态结构
   - Annotation.Root({}): 定义根状态
   - reducer: 状态更新规则
   - default: 默认值

3. Node (节点): 执行具体逻辑
   - 接收 state，返回更新后的部分 state
   - 可以是同步或异步函数

4. Edge (边): 定义流转关系
   - addEdge(from, to): 无条件边
   - addConditionalEdges(from, router, mapping): 条件边

5. 特殊节点
   - START: 起始节点
   - END: 结束节点

🔀 流程控制
─────────────────────────────────────────────────────────────────
• 串行流程: A → B → C → END
• 分支流程: A → [条件] → B1 或 B2 → END
• 循环流程: A → B → [条件] → A (继续) 或 END (结束)
• 并行流程: A → [B1, B2] → C → END

🤖 ReAct Agent 模式
─────────────────────────────────────────────────────────────────
经典的 Agent 循环：
  1. Agent 节点: LLM 分析问题，决定是否调用工具
  2. Tool 节点: 执行工具调用
  3. 路由: 检查是否还需要调用工具
  4. 循环直到 LLM 给出最终答案

代码模式:
  StateGraph → addNode(agent) → addNode(tools)
  → addConditionalEdges(agent → tools/end)
  → addEdge(tools → agent)

📊 执行方式
─────────────────────────────────────────────────────────────────
• invoke(): 同步执行，返回最终状态
• stream(): 流式执行，逐步返回每个节点的输出
• batch(): 批量执行多个输入

💡 最佳实践
─────────────────────────────────────────────────────────────────
1. 状态设计要清晰，每个字段有明确含义
2. 节点功能单一，便于调试和复用
3. 条件边要考虑所有可能的分支
4. 循环流程要设置最大迭代次数，防止死循环
5. 使用 stream() 提升用户体验

🔗 与 LangChain 的关系
─────────────────────────────────────────────────────────────────
• LangChain: 提供 LLM、Prompt、Tools 等基础组件
• LangGraph: 提供工作流编排能力
• 两者配合使用，构建复杂的 AI 应用

╚════════════════════════════════════════════════════════════════╝
`);

console.log("✅ 所有示例运行完成！");
console.log("💡 下一步建议:");
console.log("  1. 尝试修改条件分支的路由逻辑");
console.log("  2. 添加更多工具到 ReAct Agent");
console.log("  3. 实现带记忆的多轮对话 Agent");
console.log("  4. 学习 Checkpointer 实现状态持久化");
console.log("  5. 探索 LangGraph Studio 可视化调试工具");
console.log("\n📚 官方文档: https://langchain-ai.github.io/langgraphjs/\n");
