import { z } from "zod";
import { ChatDeepSeek } from "@langchain/deepseek";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import "dotenv/config";

/**
 * LangChain withStructuredOutput + Zod 结构化输出示例
 *
 * 这个示例展示了如何使用 LangChain 的 withStructuredOutput 方法结合 Zod Schema
 * 来强制 LLM 输出符合特定结构的 JSON 数据。
 *
 * 知识点：
 * 1. Zod Schema 定义：用于描述期望的数据结构和类型验证。
 * 2. withStructuredOutput：LangChain 的高级方法，将 Schema 绑定到模型。
 * 3. Prompt Template：构建提示词。
 */

// 1. 定义结构化数据的 Schema (使用 Zod)
// -------------------------------------------------------
// 我们定义一个 "CalendarEvent" 结构，用于从文本中提取日程信息。
// .describe() 方法非常重要，它会被转换成提示词或 Function Calling 的描述，
// 帮助 LLM 理解每个字段应该提取什么样的内容。
const calendarEventSchema = z.object({
  eventName: z.string().describe("事件的名称，简短概括要做的事情"),

  date: z
    .string()
    .describe(
      "事件发生的日期和时间。如果是相对时间（如'明天'），请尽量转换为具体的日期格式（YYYY-MM-DD HH:mm），参考当前日期"
    ),

  location: z
    .string()
    .optional()
    .describe("事件发生的地点。如果文本中未提及，则可以忽略"),

  participants: z.array(z.string()).describe("参与该事件的人员名单列表"),

  priority: z
    .enum(["low", "medium", "high"])
    .describe("根据文本语气判断事件的紧急程度/优先级"),
});

// 2. 初始化 LLM (Large Language Model)
// -------------------------------------------------------
// 确保项目根目录的 .env 文件中配置了 DEEPSEEK_API_KEY
// 注意：withStructuredOutput 依赖于模型对 Tool Calling (Function Calling) 或 JSON Mode 的支持。
// DeepSeek V3 (deepseek-chat) 支持 Tool Calling。
const llm = new ChatDeepSeek({
  model: "deepseek-chat",
  temperature: 0.1, // 结构化提取任务建议使用低温度，保证输出确定性
});

// 3. 绑定结构化输出
// -------------------------------------------------------
// 调用 withStructuredOutput 并传入 Zod Schema。
// 这会返回一个新的 Runnable，它接收输入（Prompt生成的的消息），并输出解析后的 JSON 对象。
// 如果模型输出不符合 Schema，LangChain 会尝试自动修复或抛出错误（取决于配置）。
const structuredLlm = llm.withStructuredOutput(calendarEventSchema);

// 4. 创建 Prompt Template
// -------------------------------------------------------
const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "你是一个专业的日程管理助手。你的任务是从用户的自然语言描述中提取结构化的日程信息。\n" +
      "当前时间是: {current_time} (请以此为基准推算相对时间)",
  ],
  ["human", "{text}"],
]);

// 5. 构建 Chain 并执行
// -------------------------------------------------------
const chain = prompt.pipe(structuredLlm);

async function main() {
  // 模拟用户输入
  const userText =
    "下周五下午3点，我和老张、小李要在星巴克开个会，讨论新项目的架构设计，这事儿非常重要，必须搞定！";
  const currentTime = new Date().toLocaleString();

  console.log("--- 输入信息 ---");
  console.log(`当前时间: ${currentTime}`);
  console.log(`用户文本: "${userText}"`);
  console.log("----------------\n");

  try {
    console.log("正在调用 LLM 进行提取...");

    // 调用 Chain
    const result = await chain.invoke({
      text: userText,
      current_time: currentTime,
    });

    console.log("\n--- 提取结果 (Zod 解析后的对象) ---");
    // result 直接就是一个符合 calendarEventSchema 结构的 JavaScript 对象
    console.log(JSON.stringify(result, null, 2));

    // 演示如何使用提取出的数据
    console.log("\n--- 业务逻辑处理 ---");
    if (result.priority === "high") {
      console.log(
        `⚠️ 检测到高优先级事件: [${result.eventName}]，已自动标记为红旗！`
      );
    }
    console.log(`📅 预定时间: ${result.date}`);
    console.log(`👥 参会人员: ${result.participants.join(", ")}`);
  } catch (error) {
    console.error("提取过程中发生错误:", error);
    console.error(
      "提示: 如果遇到 'is not a function' 错误，可能是当前使用的 @langchain/deepseek 版本尚不支持 withStructuredOutput，请尝试更新依赖或使用 OpenAI 兼容模式。"
    );
  }
}

// 执行主函数
main();
