/**
 * LangGraph 入门 Demo 7: MemorySaver 基础
 *
 * 🎯 学习目标：
 * - 理解 MemorySaver 的作用（让 AI 记住对话）
 * - 理解 Checkpointer 的概念
 * - 理解 thread_id 的作用（区分不同对话）
 * - 对比有记忆和无记忆的区别
 *
 * 📝 这是理解 LangGraph 记忆功能的基础示例
 *
 * ⚠️ 运行前请确保配置了 DEEPSEEK_API_KEY
 */

import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph";
import { ChatDeepSeek } from "@langchain/deepseek";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import "dotenv/config";

console.log("🚀 LangGraph Demo 7: MemorySaver 基础\n");
console.log("=".repeat(60));

// 检查 API Key
if (!process.env.DEEPSEEK_API_KEY) {
  console.log("❌ 错误：请先配置 DEEPSEEK_API_KEY 环境变量");
  process.exit(1);
}

// ============================================
// 核心概念解释
// ============================================

console.log("\n📚 核心概念:\n");
console.log("   ┌─────────────────────────────────────────────────┐");
console.log("   │  MemorySaver = 让 AI 记住对话历史的工具          │");
console.log("   │                                                 │");
console.log("   │  没有 MemorySaver:                              │");
console.log("   │    用户: 我叫小明 → AI: 你好小明                  │");
console.log("   │    用户: 我叫什么 → AI: 我不知道（忘了！）         │");
console.log("   │                                                 │");
console.log("   │  有 MemorySaver:                                │");
console.log("   │    用户: 我叫小明 → AI: 你好小明                  │");
console.log("   │    用户: 我叫什么 → AI: 你叫小明（记得！）         │");
console.log("   └─────────────────────────────────────────────────┘\n");

// ============================================
// 第一步：创建 MemorySaver
// ============================================

/**
 * MemorySaver 是一个 Checkpointer（检查点器）
 * 它负责保存每一轮对话后的状态（就像游戏存档）
 *
 * 特点：
 * - 存储在内存中（程序关闭后丢失）
 * - 适合开发和测试
 * - 不适合生产环境（生产环境用数据库存储）
 */
const memory = new MemorySaver();

console.log("✅ 第一步：创建 MemorySaver 实例");
console.log("   const memory = new MemorySaver();\n");

// ============================================
// 第二步：创建 LLM
// ============================================

const llm = new ChatDeepSeek({
  model: "deepseek-chat",
  temperature: 0.7,
});

console.log("✅ 第二步：创建 LLM 实例\n");

// ============================================
// 第三步：定义状态
// ============================================

/**
 * 状态中的 messages 字段使用「累加」reducer
 * 这非常重要！它让每次对话的消息都追加到历史中
 *
 * 累加 reducer: (prev, next) => [...prev, ...next]
 * - prev: 之前的消息数组
 * - next: 新的消息数组
 * - 返回: 合并后的数组
 */
const ChatState = Annotation.Root({
  messages: Annotation({
    reducer: (prev, next) => [...prev, ...next], // 关键：累加模式！
    default: () => [],
  }),
});

console.log("✅ 第三步：定义状态结构");
console.log("   messages 使用累加 reducer，保留所有历史消息\n");

// ============================================
// 第四步：定义聊天节点
// ============================================

async function chatNode(state) {
  console.log(`   [chatNode] 当前消息数: ${state.messages.length}`);

  // 添加系统提示
  const systemMessage = new SystemMessage(
    "你是一个友好的助手。请记住用户在对话中告诉你的信息（如名字、爱好等），" +
      "并在后续对话中使用这些信息。"
  );

  // 调用 LLM（包含系统提示 + 历史消息）
  const response = await llm.invoke([systemMessage, ...state.messages]);

  console.log(`   [chatNode] AI 回复完成`);

  // 返回 AI 的回复，会被追加到 messages
  return { messages: [response] };
}

console.log("✅ 第四步：定义聊天节点函数\n");

// ============================================
// 第五步：构建状态图
// ============================================

const graph = new StateGraph(ChatState)
  .addNode("chat", chatNode)
  .addEdge(START, "chat")
  .addEdge("chat", END);

console.log("✅ 第五步：构建状态图");
console.log("   START → chat → END\n");

// ============================================
// 第六步：编译（关键！传入 checkpointer）
// ============================================

/**
 * compile() 时传入 checkpointer 参数
 * 这是启用记忆功能的关键！
 *
 * 不传 checkpointer: 每次调用都是全新的，无记忆
 * 传入 checkpointer: 会保存和恢复状态，有记忆
 */
const appWithMemory = graph.compile({
  checkpointer: memory, // 关键！添加记忆功能
});

// 同时创建一个无记忆的版本用于对比
const appWithoutMemory = graph.compile(); // 不传 checkpointer

console.log("✅ 第六步：编译状态图");
console.log("   有记忆版本: graph.compile({ checkpointer: memory })");
console.log("   无记忆版本: graph.compile()\n");

// ============================================
// 演示：有记忆 vs 无记忆
// ============================================

console.log("=".repeat(60));
console.log("🔬 实验对比：有记忆 vs 无记忆\n");

// 定义测试对话
const conversations = [
  "你好，我叫小明",
  "我喜欢编程，特别是 JavaScript",
  "请问我叫什么名字？我喜欢什么？",
];

// ----- 测试无记忆版本 -----

console.log("━".repeat(60));
console.log("❌ 【无记忆版本】每次对话都是全新的\n");

for (let i = 0; i < conversations.length; i++) {
  console.log(`📝 第 ${i + 1} 轮对话:`);
  console.log(`   👤 用户: ${conversations[i]}`);

  const result = await appWithoutMemory.invoke({
    messages: [new HumanMessage(conversations[i])],
  });

  const aiResponse = result.messages[result.messages.length - 1].content;
  console.log(`   🤖 AI: ${aiResponse}\n`);
}

console.log("   💡 观察: 第三轮 AI 不记得名字和爱好！\n");

// ----- 测试有记忆版本 -----

console.log("━".repeat(60));
console.log("✅ 【有记忆版本】使用 MemorySaver + thread_id\n");

/**
 * thread_id 是对话的唯一标识
 * - 相同的 thread_id = 继续之前的对话
 * - 不同的 thread_id = 开始新的对话
 *
 * 就像聊天软件里的「会话ID」
 */
const threadId = "demo_thread_001";
const config = { configurable: { thread_id: threadId } };

console.log(`   📌 使用 thread_id: "${threadId}"\n`);

for (let i = 0; i < conversations.length; i++) {
  console.log(`📝 第 ${i + 1} 轮对话:`);
  console.log(`   👤 用户: ${conversations[i]}`);

  // 注意：invoke 的第二个参数传入 config，包含 thread_id
  const result = await appWithMemory.invoke(
    { messages: [new HumanMessage(conversations[i])] },
    config // 关键！指定 thread_id
  );

  const aiResponse = result.messages[result.messages.length - 1].content;
  console.log(`   🤖 AI: ${aiResponse}\n`);
}

console.log("   💡 观察: 第三轮 AI 记得名字和爱好！\n");

// ============================================
// 查看状态
// ============================================

console.log("━".repeat(60));
console.log("🔍 查看当前状态（记录的消息历史）\n");

const currentState = await appWithMemory.getState(config);
console.log(`   总消息数: ${currentState.values.messages.length}`);
console.log("   消息类型列表:");
currentState.values.messages.forEach((msg, index) => {
  const type = msg.constructor.name;
  const preview = msg.content.substring(0, 30) + "...";
  console.log(`     ${index + 1}. [${type}] ${preview}`);
});

// ============================================
// 演示：thread_id 的隔离性
// ============================================

console.log("\n━".repeat(60));
console.log("🔀 演示: 不同 thread_id 的对话是隔离的\n");

// 使用新的 thread_id
const newConfig = { configurable: { thread_id: "demo_thread_002" } };

console.log('   使用新的 thread_id: "demo_thread_002"');
console.log("   👤 用户: 我叫什么？\n");

const isolationResult = await appWithMemory.invoke(
  { messages: [new HumanMessage("我叫什么？")] },
  newConfig // 新的 thread_id
);

const isolationResponse =
  isolationResult.messages[isolationResult.messages.length - 1].content;
console.log(`   🤖 AI: ${isolationResponse}`);
console.log("\n   💡 新线程不知道小明，因为是独立的对话！\n");

// ============================================
// 总结
// ============================================

console.log("=".repeat(60));
console.log("📖 重点总结:\n");
console.log("   1️⃣  创建 MemorySaver:");
console.log("      const memory = new MemorySaver();\n");
console.log("   2️⃣  编译时传入 checkpointer:");
console.log("      graph.compile({ checkpointer: memory });\n");
console.log("   3️⃣  调用时指定 thread_id:");
console.log(
  '      app.invoke(input, { configurable: { thread_id: "xxx" } });\n'
);
console.log("   4️⃣  messages 使用累加 reducer:");
console.log("      reducer: (prev, next) => [...prev, ...next]\n");
console.log("   5️⃣  不同 thread_id 的对话互相隔离\n");
console.log("=".repeat(60));

// ============================================
// 动手练习
// ============================================

console.log("\n🎯 动手练习:");
console.log("   1. 尝试继续用 thread_id 'demo_thread_001' 对话");
console.log("   2. 创建一个新的 thread_id，开始全新对话");
console.log("   3. 观察 getState() 返回的消息数量变化");
console.log("   4. 思考：如果要实现多用户聊天，thread_id 应该怎么设计？\n");
