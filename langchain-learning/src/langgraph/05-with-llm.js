/**
 * LangGraph 入门 Demo 5: 结合 LLM
 *
 * 🎯 学习目标：
 * - 理解如何在 LangGraph 节点中调用 LLM
 * - 理解状态如何在 LLM 节点间传递
 * - 实现一个简单的内容创作流水线
 *
 * 📝 场景：AI 写作助手
 *    输入主题 → 生成标题 → 生成内容 → 生成摘要
 *
 * ⚠️ 运行前请确保配置了 DEEPSEEK_API_KEY
 */

import { StateGraph, Annotation, END, START } from "@langchain/langgraph";
import { ChatDeepSeek } from "@langchain/deepseek";
import { HumanMessage } from "@langchain/core/messages";
import "dotenv/config";

console.log("🚀 LangGraph Demo 5: 结合 LLM\n");
console.log("=".repeat(50));

// 检查 API Key
if (!process.env.DEEPSEEK_API_KEY) {
  console.log("❌ 错误：请先配置 DEEPSEEK_API_KEY 环境变量");
  console.log("   在 .env 文件中添加: DEEPSEEK_API_KEY=your_api_key");
  process.exit(1);
}

// 初始化 LLM
const llm = new ChatDeepSeek({
  model: "deepseek-chat",
  temperature: 0.7,
});

console.log("✅ LLM 初始化成功\n");

// ============================================
// 第一步：定义状态
// ============================================

const WriterState = Annotation.Root({
  // 输入的主题
  topic: Annotation({
    reducer: (_, next) => next,
    default: () => "",
  }),
  // 生成的标题
  title: Annotation({
    reducer: (_, next) => next,
    default: () => "",
  }),
  // 生成的内容
  content: Annotation({
    reducer: (_, next) => next,
    default: () => "",
  }),
  // 生成的摘要
  summary: Annotation({
    reducer: (_, next) => next,
    default: () => "",
  }),
});

console.log("📋 状态结构:");
console.log("   - topic: 主题（输入）");
console.log("   - title: 标题（LLM生成）");
console.log("   - content: 内容（LLM生成）");
console.log("   - summary: 摘要（LLM生成）\n");

// ============================================
// 第二步：定义 LLM 节点
// ============================================

// 节点 1：生成标题
async function generateTitle(state) {
  console.log(`   [generateTitle] 主题: ${state.topic}`);
  console.log(`   [generateTitle] 正在生成标题...`);

  const response = await llm.invoke([
    new HumanMessage(
      `请为主题"${state.topic}"生成一个吸引人的文章标题。
要求：
1. 标题要有吸引力
2. 15字以内
3. 只输出标题本身，不要其他内容`
    ),
  ]);

  const title = response.content.trim();
  console.log(`   [generateTitle] ✅ 标题: ${title}`);

  return { title };
}

// 节点 2：生成内容
async function generateContent(state) {
  console.log(`   [generateContent] 根据标题生成内容...`);

  const response = await llm.invoke([
    new HumanMessage(
      `请根据以下标题写一段文章内容：
标题：${state.title}

要求：
1. 100字左右
2. 内容要与标题相关
3. 语言生动有趣`
    ),
  ]);

  const content = response.content.trim();
  console.log(`   [generateContent] ✅ 内容生成完成（${content.length}字）`);

  return { content };
}

// 节点 3：生成摘要
async function generateSummary(state) {
  console.log(`   [generateSummary] 生成摘要...`);

  const response = await llm.invoke([
    new HumanMessage(
      `请用一句话总结以下文章的核心观点：

${state.content}

要求：只输出总结，不超过30字`
    ),
  ]);

  const summary = response.content.trim();
  console.log(`   [generateSummary] ✅ 摘要: ${summary}`);

  return { summary };
}

console.log("🔧 节点定义:");
console.log("   - generateTitle: 调用 LLM 生成标题");
console.log("   - generateContent: 调用 LLM 生成内容");
console.log("   - generateSummary: 调用 LLM 生成摘要\n");

// ============================================
// 第三步：构建状态图
// ============================================

const graph = new StateGraph(WriterState)
  .addNode("generateTitle", generateTitle)
  .addNode("generateContent", generateContent)
  .addNode("generateSummary", generateSummary)
  .addEdge(START, "generateTitle")
  .addEdge("generateTitle", "generateContent")
  .addEdge("generateContent", "generateSummary")
  .addEdge("generateSummary", END);

console.log("🔗 流程图:");
console.log("   START → generateTitle → generateContent → generateSummary → END\n");

// ============================================
// 第四步：编译并运行
// ============================================

const app = graph.compile();

const topic = "如何用 LangGraph 构建 AI Agent";

console.log(`📝 输入主题: "${topic}"\n`);
console.log("▶️  开始执行 AI 写作流水线...\n");
console.log("-".repeat(50));

const startTime = Date.now();
const result = await app.invoke({ topic });
const endTime = Date.now();

console.log("-".repeat(50));

console.log("\n✅ 执行完成！\n");
console.log("📊 生成结果:");
console.log("═".repeat(50));
console.log(`📌 主题: ${result.topic}`);
console.log("─".repeat(50));
console.log(`📰 标题: ${result.title}`);
console.log("─".repeat(50));
console.log(`📄 内容:\n${result.content}`);
console.log("─".repeat(50));
console.log(`📋 摘要: ${result.summary}`);
console.log("═".repeat(50));
console.log(`⏱️  总耗时: ${endTime - startTime}ms`);

// ============================================
// 重点理解
// ============================================

console.log("\n" + "=".repeat(50));
console.log("💡 重点理解 - LLM 节点的特点:\n");
console.log("   1. 节点是 async 函数，可以 await 异步操作");
console.log("   2. 每个节点可以读取之前节点更新的状态");
console.log("   3. generateContent 依赖 generateTitle 的结果");
console.log("   4. generateSummary 依赖 generateContent 的结果");
console.log("\n   这就是 LangGraph 管理状态的威力！");
console.log("=".repeat(50));

// ============================================
// 动手练习
// ============================================

console.log("\n🎯 动手练习:");
console.log("   1. 添加一个"质量检查"节点，检查内容是否符合要求");
console.log("   2. 如果检查不通过，循环回去重新生成");
console.log("   3. 添加并行节点，同时生成中文和英文版本");

