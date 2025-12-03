/**
 * LangGraph 入门 Demo 8: 带记忆的聊天机器人
 *
 * 🎯 学习目标：
 * - 构建一个完整的多轮对话聊天机器人
 * - 学习如何管理对话上下文
 * - 理解消息历史的限制和优化
 * - 实现用户友好的对话界面
 *
 * 📝 这是一个可以实际使用的聊天机器人示例
 *
 * ⚠️ 运行前请确保配置了 DEEPSEEK_API_KEY
 */

import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph";
import { ChatDeepSeek } from "@langchain/deepseek";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
} from "@langchain/core/messages";
import "dotenv/config";
import * as readline from "readline";

console.log("🚀 LangGraph Demo 8: 带记忆的聊天机器人\n");
console.log("=".repeat(60));

// 检查 API Key
if (!process.env.DEEPSEEK_API_KEY) {
  console.log("❌ 错误：请先配置 DEEPSEEK_API_KEY 环境变量");
  process.exit(1);
}

// ============================================
// 配置区域（可自定义）
// ============================================

const CONFIG = {
  // LLM 配置
  model: "deepseek-chat",
  temperature: 0.7,

  // 消息历史限制（防止超出 token 限制）
  maxMessages: 20, // 最多保留的消息数量

  // 系统提示词
  systemPrompt: `你是一个友好、有帮助的 AI 助手。

你的特点：
1. 记住用户在对话中告诉你的信息（名字、偏好、之前讨论的话题等）
2. 回答要简洁但有帮助
3. 可以进行日常对话，也可以回答技术问题
4. 保持对话的连贯性，适当引用之前的对话内容

当用户第一次和你对话时，你可以友好地问候并询问怎么称呼对方。`,
};

console.log("📋 配置信息:");
console.log(`   模型: ${CONFIG.model}`);
console.log(`   Temperature: ${CONFIG.temperature}`);
console.log(`   最大消息数: ${CONFIG.maxMessages}\n`);

// ============================================
// 第一步：创建核心组件
// ============================================

// 创建 MemorySaver
const memory = new MemorySaver();

// 创建 LLM
const llm = new ChatDeepSeek({
  model: CONFIG.model,
  temperature: CONFIG.temperature,
});

console.log("✅ 核心组件已创建\n");

// ============================================
// 第二步：定义状态
// ============================================

/**
 * 聊天机器人的状态
 *
 * 为什么只有 messages？
 * - 对于简单的聊天机器人，消息历史就是全部状态
 * - 更复杂的应用可以添加其他字段（用户信息、对话主题等）
 */
const ChatbotState = Annotation.Root({
  messages: Annotation({
    reducer: (prev, next) => {
      // 累加消息
      const allMessages = [...prev, ...next];

      // 限制消息数量，保留最近的消息
      // 这很重要，因为 LLM 有 token 限制
      if (allMessages.length > CONFIG.maxMessages) {
        console.log(`   ⚠️ 消息数超过 ${CONFIG.maxMessages}，裁剪旧消息...`);
        return allMessages.slice(-CONFIG.maxMessages);
      }

      return allMessages;
    },
    default: () => [],
  }),
});

// ============================================
// 第三步：定义聊天节点
// ============================================

/**
 * 聊天节点
 *
 * 职责：
 * 1. 构建发送给 LLM 的消息（系统提示 + 历史 + 用户输入）
 * 2. 调用 LLM 获取回复
 * 3. 返回 AI 回复
 */
async function chatNode(state) {
  // 系统消息
  const systemMessage = new SystemMessage(CONFIG.systemPrompt);

  // 组合消息：系统提示 + 历史消息
  const messagesToSend = [systemMessage, ...state.messages];

  // 调用 LLM
  const response = await llm.invoke(messagesToSend);

  // 返回 AI 回复
  return { messages: [response] };
}

// ============================================
// 第四步：构建并编译图
// ============================================

const chatbot = new StateGraph(ChatbotState)
  .addNode("chat", chatNode)
  .addEdge(START, "chat")
  .addEdge("chat", END)
  .compile({
    checkpointer: memory, // 启用记忆
  });

console.log("✅ 聊天机器人已构建完成\n");

// ============================================
// 第五步：实现对话函数
// ============================================

/**
 * 发送消息并获取回复
 *
 * @param {string} threadId - 对话线程ID
 * @param {string} userMessage - 用户消息
 * @returns {Promise<string>} AI 回复
 */
async function sendMessage(threadId, userMessage) {
  const config = { configurable: { thread_id: threadId } };

  const result = await chatbot.invoke(
    { messages: [new HumanMessage(userMessage)] },
    config
  );

  // 获取最后一条消息（AI 回复）
  const aiResponse = result.messages[result.messages.length - 1];
  return aiResponse.content;
}

/**
 * 获取对话历史信息
 *
 * @param {string} threadId - 对话线程ID
 * @returns {Promise<object>} 对话状态
 */
async function getConversationInfo(threadId) {
  const config = { configurable: { thread_id: threadId } };
  const state = await chatbot.getState(config);

  return {
    messageCount: state.values?.messages?.length || 0,
    messages: state.values?.messages || [],
  };
}

/**
 * 显示对话历史
 *
 * @param {string} threadId - 对话线程ID
 */
async function showHistory(threadId) {
  const info = await getConversationInfo(threadId);

  console.log("\n📜 对话历史:");
  console.log("-".repeat(50));

  if (info.messageCount === 0) {
    console.log("   （暂无对话记录）");
  } else {
    info.messages.forEach((msg, index) => {
      const role = msg instanceof HumanMessage ? "👤 用户" : "🤖 AI";
      const content =
        msg.content.length > 60
          ? msg.content.substring(0, 60) + "..."
          : msg.content;
      console.log(`   ${index + 1}. ${role}: ${content}`);
    });
  }

  console.log("-".repeat(50));
  console.log(`   总消息数: ${info.messageCount}\n`);
}

// ============================================
// 第六步：实现交互式命令行界面
// ============================================

/**
 * 创建交互式聊天界面
 */
async function startInteractiveChat() {
  // 生成唯一的对话ID
  const threadId = `chat_${Date.now()}`;

  console.log("=".repeat(60));
  console.log("🤖 欢迎使用 AI 聊天助手！\n");
  console.log(`   对话ID: ${threadId}`);
  console.log("   输入消息与 AI 对话");
  console.log("   输入 /history 查看对话历史");
  console.log("   输入 /new 开始新对话");
  console.log("   输入 /quit 退出程序\n");
  console.log("=".repeat(60));

  // 创建 readline 接口
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let currentThreadId = threadId;

  // 提问函数
  const askQuestion = () => {
    rl.question("\n👤 你: ", async (input) => {
      const trimmedInput = input.trim();

      // 处理命令
      if (trimmedInput === "/quit") {
        console.log("\n👋 再见！期待下次与你对话！\n");
        rl.close();
        return;
      }

      if (trimmedInput === "/history") {
        await showHistory(currentThreadId);
        askQuestion();
        return;
      }

      if (trimmedInput === "/new") {
        currentThreadId = `chat_${Date.now()}`;
        console.log(`\n🔄 已开始新对话，ID: ${currentThreadId}`);
        askQuestion();
        return;
      }

      if (!trimmedInput) {
        askQuestion();
        return;
      }

      // 发送消息
      try {
        console.log("\n🤔 AI 正在思考...");
        const response = await sendMessage(currentThreadId, trimmedInput);
        console.log(`\n🤖 AI: ${response}`);
      } catch (error) {
        console.log(`\n❌ 发生错误: ${error.message}`);
      }

      askQuestion();
    });
  };

  askQuestion();
}

// ============================================
// 第七步：演示模式（自动对话）
// ============================================

async function runDemoMode() {
  console.log("=".repeat(60));
  console.log("📺 演示模式：自动进行多轮对话\n");

  const threadId = "demo_chatbot";

  // 模拟对话
  const conversations = [
    "你好！",
    "我叫小明，是一名程序员",
    "我最近在学习 LangGraph",
    "你能给我一些学习建议吗？",
    "对了，你还记得我叫什么吗？",
  ];

  for (let i = 0; i < conversations.length; i++) {
    console.log("-".repeat(50));
    console.log(`📝 第 ${i + 1} 轮对话\n`);
    console.log(`👤 用户: ${conversations[i]}`);

    const response = await sendMessage(threadId, conversations[i]);
    console.log(`🤖 AI: ${response}\n`);

    // 添加延迟，让演示更自然
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // 显示对话历史
  await showHistory(threadId);

  console.log("=".repeat(60));
  console.log("✅ 演示完成！\n");
  console.log("💡 观察要点:");
  console.log("   1. AI 记住了用户的名字「小明」");
  console.log("   2. AI 记住了用户是程序员");
  console.log("   3. AI 记住了用户在学习 LangGraph");
  console.log("   4. 在最后一轮，AI 能正确回忆起用户的名字\n");
}

// ============================================
// 主程序
// ============================================

async function main() {
  // 检查命令行参数
  const args = process.argv.slice(2);

  if (args.includes("--interactive") || args.includes("-i")) {
    // 交互模式
    await startInteractiveChat();
  } else {
    // 默认运行演示模式
    await runDemoMode();

    console.log("=".repeat(60));
    console.log("🎯 动手练习:\n");
    console.log("   运行交互模式，与 AI 真实对话:");
    console.log("   node 08-memory-chatbot.js --interactive\n");
    console.log("   或简写:");
    console.log("   node 08-memory-chatbot.js -i\n");
  }
}

main().catch(console.error);
