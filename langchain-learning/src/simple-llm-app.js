import { ChatDeepSeek } from "@langchain/deepseek";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import "dotenv/config";

// 1. 初始化 LLM (Initialize the LLM)
const llm = new ChatDeepSeek({
  model: "deepseek-chat",
  temperature: 0.7,
});

// 2. 创建 Prompt Template (Create a Prompt Template)
// 使用模版来构造提示词，这里包含 input_language, output_language 和 text 三个变量
const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "You are a helpful assistant that translates {input_language} to {output_language}.",
  ],
  ["human", "{text}"],
]);

// 3. 创建 Chain (Create a Chain)
// 将 prompt, llm 和 output parser 连接起来
// StringOutputParser 会将 ChatMessage 转换为字符串，方便处理
const chain = prompt.pipe(llm).pipe(new StringOutputParser());

// 4. 使用 Stream 流式输出 (Stream the response)
console.log("Starting stream...");

// 调用 stream 方法，传入模版所需的变量
const stream = await chain.stream({
  input_language: "English",
  output_language: "Chinese", // 翻译成中文
  text: "I love programming with LangChain! It is very powerful.",
});

// 遍历流式结果并打印
for await (const chunk of stream) {
  // 因为使用了 StringOutputParser，这里的 chunk 直接就是字符串片段
  process.stdout.write(chunk);
}

console.log("\n\nStream finished.");
