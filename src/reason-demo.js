import OpenAI from "openai";
import dotenv from "dotenv";

// 加载环境变量
dotenv.config();

// 读取 API Key（支持 DEEPSEEK_API_KEY 或 OPENAI_API_KEY）
const API_KEY = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
if (!API_KEY) {
  // 提前友好报错，避免 OpenAI 构造函数抛出缺少凭证
  console.error(
    "❌ 错误: 未检测到 API 密钥。请在 .env 设置 DEEPSEEK_API_KEY 或 OPENAI_API_KEY"
  );
  console.error("示例: DEEPSEEK_API_KEY=你的密钥");
  process.exit(1);
}

// 初始化 DeepSeek API（OpenAI 兼容）
const client = new OpenAI({
  apiKey: API_KEY,
  baseURL: "https://api.deepseek.com/v1",
});

/**
 * 使用 deepseek-reasoner 模型，流式打印：先打印 reasoning_content（推理过程），再打印 content（最终答案）
 * @param {string} question - 用户问题
 * @returns {{ reasoning: string, content: string }} 汇总后的推理与答案文本
 */
async function streamReasoner(question) {
  // 这里无需再检查，已在模块顶层校验 API_KEY

  console.log("🤖 使用 deepseek-reasoner 流式演示");
  console.log(`👤 用户: ${question}\n`);
  console.log("🧠 推理（reasoning_content）:");

  const stream = await client.chat.completions.create({
    model: "deepseek-reasoner",
    messages: [
      { role: "system", content: "你是一个有用的AI助手，请用中文回答问题。" },
      { role: "user", content: question },
    ],
    stream: true,
    // 若需要可调整以下参数
    max_tokens: 1000,
    temperature: 0.7,
  });

  let reasoning = "";
  let content = "";
  let contentStarted = false;

  for await (const chunk of stream) {
    const r = chunk.choices?.[0]?.delta?.reasoning_content || "";
    const c = chunk.choices?.[0]?.delta?.content || "";

    if (r) {
      process.stdout.write(r);
      reasoning += r;
    }

    if (c) {
      if (!contentStarted) {
        console.log("\n\n🗣️ 最终答案（content）:");
        contentStarted = true;
      }
      process.stdout.write(c);
      content += c;
    }
  }

  console.log("\n" + "=".repeat(50) + "\n");
  return { reasoning, content };
}

// 直接运行脚本时，演示固定问题：天空为什么是蓝色的
async function main() {
  try {
    await streamReasoner("天空为什么是蓝色的");
  } catch (error) {
    console.error("❌ 请求失败:", error.message);
    if (error.response) {
      console.error("响应状态:", error.response.status);
      console.error("响应数据:", error.response.data);
    }
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { streamReasoner };
