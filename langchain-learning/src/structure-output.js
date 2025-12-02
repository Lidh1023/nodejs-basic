import { z } from "zod";
import { ChatDeepSeek } from "@langchain/deepseek";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import "dotenv/config";

/**
 * LangChain withStructuredOutput 个人信息提取示例
 *
 * 任务：从一段个人介绍文本中提取结构化的用户信息。
 *
 * 知识点：
 * 1. Zod Schema 定义：name, age, gender, skills
 * 2. withStructuredOutput：结构化输出绑定
 */

// 1. 定义 Zod Schema
// -------------------------------------------------------
const userProfileSchema = z.object({
  name: z.string().describe("用户的姓名"),

  age: z
    .number()
    .optional()
    .describe("用户的年龄。如果文中未提及具体数字，可尝试根据描述推断或留空"),

  gender: z.enum(["male", "female", "other", "unknown"]).describe("用户的性别"),

  skills: z
    .array(z.string())
    .describe("用户掌握的技能列表，例如编程语言、工具或专业能力"),
});

// 2. 初始化 LLM
// -------------------------------------------------------
const llm = new ChatDeepSeek({
  model: "deepseek-chat",
  temperature: 0, // 信息提取任务通常设为 0 以获得最精确的结果
});

// 3. 绑定结构化输出
// -------------------------------------------------------
const structuredLlm = llm.withStructuredOutput(userProfileSchema);

// 4. 创建 Prompt Template
// -------------------------------------------------------
const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "你是一个专门负责提取用户信息的 AI 助手。请从以下用户介绍中提取关键信息，并按指定格式输出。",
  ],
  ["human", "{introduction}"],
]);

// 5. 构建 Chain
// -------------------------------------------------------
const chain = prompt.pipe(structuredLlm);

async function main() {
  // 模拟输入的个人介绍
  const userIntroduction = `
    大家好，我叫李明，今年28岁。我是一名全栈工程师，
    平时主要使用 Node.js 和 React 进行开发，偶尔也写写 Python。
    我也很擅长使用 Docker 进行容器化部署，最近正在学习 LangChain 和 AI 应用开发。
    我是男生，喜欢打篮球。
  `;

  console.log("--- 输入的个人介绍 ---");
  console.log(userIntroduction.trim());
  console.log("----------------------\n");

  try {
    console.log("正在提取信息...");

    const result = await chain.invoke({
      introduction: userIntroduction,
    });

    console.log("\n--- 结构化输出结果 ---");
    console.log(JSON.stringify(result, null, 2));

    // 验证字段访问
    console.log("\n--- 字段访问演示 ---");
    console.log(`姓名: ${result.name}`);
    console.log(`技能数量: ${result.skills?.length || 0}`);
  } catch (error) {
    console.error("执行出错:", error);
  }
}

main();
