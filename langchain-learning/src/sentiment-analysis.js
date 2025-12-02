import { z } from "zod";
import { ChatDeepSeek } from "@langchain/deepseek";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import "dotenv/config";

/**
 * LangChain withStructuredOutput 情感分类示例
 *
 * 任务：对用户输入的句子进行情感分析，判断其为"褒义"、"贬义"或"中性"。
 *
 * 知识点：
 * 1. 使用 Zod Enum 限制输出的可选值。
 * 2. 使用 describe 引导模型进行逻辑推理（reasoning）。
 */

// 1. 定义结构化输出 Schema
// -------------------------------------------------------
const sentimentSchema = z.object({
  category: z
    .enum(["褒义", "贬义", "中性"])
    .describe(
      "句子的情感分类。褒义：表达赞扬、喜爱、肯定；贬义：表达批评、讨厌、否定；中性：客观陈述，无明显情感色彩。"
    ),

  intensity: z
    .number()
    .min(1)
    .max(10)
    .describe("情感强烈程度评分 (1-10)。10表示非常强烈，1表示非常微弱。"),

  reason: z
    .string()
    .describe("判断属于该分类的具体理由，请引用原句中的关键词进行解释。"),
});

// 2. 初始化 LLM
// -------------------------------------------------------
const llm = new ChatDeepSeek({
  model: "deepseek-chat",
  temperature: 0, // 分类任务建议使用低温度
});

// 3. 绑定结构化输出
// -------------------------------------------------------
const structuredLlm = llm.withStructuredOutput(sentimentSchema);

// 4. 创建 Prompt Template
// -------------------------------------------------------
const prompt = ChatPromptTemplate.fromMessages([
  ["system", "你是一个情感分析专家。请分析用户输入的文本，判断其情感倾向。"],
  ["human", "{text}"],
]);

// 5. 构建 Chain
// -------------------------------------------------------
const chain = prompt.pipe(structuredLlm);

// 6. 主函数：批量测试不同类型的句子
// -------------------------------------------------------
async function main() {
  const testSentences = [
    "这家餐厅的服务太棒了，菜品味道也超乎想象！",
    "今天的天气一般般，不好也不坏。",
    "这个产品的设计简直是反人类，完全没法用，浪费钱！",
  ];

  console.log("=== 开始情感分析任务 ===\n");

  for (const sentence of testSentences) {
    console.log(`📝 分析文本: "${sentence}"`);

    try {
      const result = await chain.invoke({
        text: sentence,
      });

      console.log("✅ 分析结果:");
      console.log(JSON.stringify(result, null, 2));
      console.log("-----------------------------------");
    } catch (error) {
      console.error("❌ 分析出错:", error);
    }
  }
}

main();
