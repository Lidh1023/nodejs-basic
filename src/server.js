import http from "node:http";
import dotenv from "dotenv";
import { readFile } from "node:fs/promises";
import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph";
import { ChatDeepSeek } from "@langchain/deepseek";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
} from "@langchain/core/messages";

dotenv.config();

// ============================================
// 配置
// ============================================
const MAX_MESSAGES = 10; // 最多保留 10 条消息

// ============================================
// 创建 MemorySaver 和 LLM
// ============================================
const memory = new MemorySaver();

const llm = new ChatDeepSeek({
  model: "deepseek-chat",
  temperature: 0.7,
  maxTokens: 1000,
  streaming: true, // 启用流式输出
});

// ============================================
// 定义状态
// ============================================
const ChatState = Annotation.Root({
  messages: Annotation({
    reducer: (prev, next) => {
      // 累加消息
      const allMessages = [...prev, ...next];

      // 限制消息数量，保留最近的消息
      if (allMessages.length > MAX_MESSAGES) {
        console.log(`📝 消息数超过 ${MAX_MESSAGES}，裁剪旧消息...`);
        return allMessages.slice(-MAX_MESSAGES);
      }

      return allMessages;
    },
    default: () => [],
  }),
});

// ============================================
// 定义聊天节点
// ============================================
async function chatNode(state) {
  // 系统提示
  const systemMessage = new SystemMessage(
    "你是一个有用的AI助手，请用中文回答问题。记住之前对话的上下文。"
  );

  // 组合消息
  const messagesToSend = [systemMessage, ...state.messages];

  // 调用 LLM
  const response = await llm.invoke(messagesToSend);

  return { messages: [response] };
}

// ============================================
// 构建并编译图
// ============================================
const chatbot = new StateGraph(ChatState)
  .addNode("chat", chatNode)
  .addEdge(START, "chat")
  .addEdge("chat", END)
  .compile({
    checkpointer: memory, // 启用记忆
  });

// ============================================
// 流式聊天节点（用于 SSE）
// ============================================
async function* streamChatWithMemory(threadId, userMessage) {
  const config = { configurable: { thread_id: threadId } };

  // 获取当前状态，打印消息数
  const currentState = await chatbot.getState(config);
  const currentMsgCount = currentState.values?.messages?.length || 0;
  console.log(`💬 Thread: ${threadId}, 当前消息数: ${currentMsgCount}`);

  // 系统提示
  const systemMessage = new SystemMessage(
    "你是一个有用的AI助手，请用中文回答问题。记住之前对话的上下文。"
  );

  // 获取历史消息
  const historyMessages = currentState.values?.messages || [];

  // 构建完整的消息列表
  const messagesToSend = [
    systemMessage,
    ...historyMessages,
    new HumanMessage(userMessage),
  ];

  // 流式调用 LLM
  let fullResponse = "";
  const stream = await llm.stream(messagesToSend);

  for await (const chunk of stream) {
    const content = chunk.content || "";
    if (content) {
      fullResponse += content;
      yield { type: "message", content };
    }
  }

  // 更新状态：保存用户消息和 AI 回复
  await chatbot.invoke(
    { messages: [new HumanMessage(userMessage), new AIMessage(fullResponse)] },
    config
  );

  // 打印更新后的消息数
  const newState = await chatbot.getState(config);
  console.log(`✅ 更新后消息数: ${newState.values?.messages?.length || 0}`);

  yield { type: "done", content: "[DONE]" };
}

// ============================================
// HTTP 服务器
// ============================================
function sendJson(res, type, content) {
  res.write(JSON.stringify({ type, content }) + "\n");
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");

  // 静态页面
  if (
    req.method === "GET" &&
    (url.pathname === "/" || url.pathname === "/chat.html")
  ) {
    readFile(new URL("./chat.html", import.meta.url))
      .then((buf) => {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(buf);
      })
      .catch(() => {
        res.statusCode = 404;
        res.end("Not Found");
      });
    return;
  }

  // 聊天 API
  if (req.method === "POST" && url.pathname === "/api/chat") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", async () => {
      let message = "";
      let threadId = "default_thread"; // 默认线程ID

      try {
        const json = JSON.parse(body || "{}");
        message = json.message || "";
        threadId = json.threadId || threadId;
      } catch {
        message = String(body || "");
      }

      res.writeHead(200, {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      res.flushHeaders?.();

      try {
        // 使用带记忆的流式聊天
        const generator = streamChatWithMemory(threadId, message);

        for await (const event of generator) {
          sendJson(res, event.type, event.content);
        }
      } catch (error) {
        console.error("❌ 聊天错误:", error);
        sendJson(res, "error", error.message);
      } finally {
        res.end();
      }
    });
    return;
  }

  // 获取聊天历史 API
  if (req.method === "GET" && url.pathname === "/api/history") {
    const threadId = url.searchParams.get("threadId") || "default_thread";

    chatbot
      .getState({ configurable: { thread_id: threadId } })
      .then((state) => {
        const messages = state.values?.messages || [];
        const history = messages.map((msg) => ({
          role: msg instanceof HumanMessage ? "user" : "assistant",
          content: msg.content,
        }));

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ threadId, history, count: history.length }));
      })
      .catch((error) => {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: error.message }));
      });
    return;
  }

  res.statusCode = 404;
  res.end("Not Found");
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
server.listen(PORT, () => {
  console.log(`🚀 服务器启动: http://localhost:${PORT}`);
  console.log(
    `📝 使用 MemorySaver 管理聊天记录，最多保留 ${MAX_MESSAGES} 条消息`
  );
});

export default server;
