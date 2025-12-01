import { ChatDeepSeek } from "@langchain/deepseek";
import { PromptTemplate } from "@langchain/core/prompts";
import { FewShotPromptTemplate } from "@langchain/core/prompts";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import "dotenv/config";

const examplePrompt = PromptTemplate.fromTemplate(
  "Question: {question}\nAnswer: {answer}"
);

const examples = [
  {
    question: `
      给以下 JS 函数写注释
      function add(a, b) {
        return a + b;
      }`,
    answer: `
      /**
      * 两个数字相加求和
      * @param {number} a - 第一个数字
      * @param {number} b - 第二个数字
      * @returns {number} 两个数字的和
      */`,
  },
  {
    question: `
      给以下 JS 函数写注释
      function getUser(id) {
        return db.findUserById(id);
      }
    `,
    answer: `
      /**
      * 根据用户ID从数据库中获取用户信息
      * @param {string} id - 唯一的用户 id
      * @returns {Object|null} 返回用户对象，如果未找到则返回 null
      */`,
  },
];

// Helper to escape single curly braces so the prompt templating (f-string)
// won't attempt to interpolate JS code blocks that contain `{` and `}`.
const escapeCurlyBraces = (s) => s.replace(/\{/g, "{{").replace(/\}/g, "}}");

// Use escaped examples to avoid Missing value for input errors when the
// example text contains curly braces (common in code snippets).
const escapedExamples = examples.map((ex) => ({
  ...ex,
  question: escapeCurlyBraces(ex.question),
  answer: escapeCurlyBraces(ex.answer),
}));

const prompt = new FewShotPromptTemplate({
  examples: escapedExamples,
  examplePrompt,
  suffix: "Question: {input}",
  inputVariables: ["input"],
});

const rawInput = `
  给以下 JS 函数写注释
  function formatDate(date) {
    return date.toISOString().split('T')[0];
  }`;

const formatted = await prompt.format({
  input: escapeCurlyBraces(rawInput),
});

// console.log(formatted.toString())

const llm = new ChatDeepSeek({
  model: "deepseek-chat",
});

// System prompt as requested by the user
const systemPrompt = `你是一名资深的 Node.js 工程师，请为给定的函数写英文文档注释。
格式要求：
1. 使用 JSDoc 风格。
2. 每个参数必须有描述。
3. 结尾要有返回值说明。`;

// Build chat messages: system prompt + the formatted few-shot prompt as user input
const messages = [
  new SystemMessage(systemPrompt),
  new HumanMessage(formatted.toString()),
];

// Invoke the model and print the returned content
const res = await llm.invoke(messages);
console.log(res.content);
