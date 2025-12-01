import { ChatDeepSeek } from "@langchain/deepseek";
import { PromptTemplate } from "@langchain/core/prompts";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import "dotenv/config";

const llm = new ChatDeepSeek({
  model: "deepseek-chat",
});
// We will ask the model to use chain-of-thought internally to reason about the
// problem, but to only return a brief summary of the reasoning (not raw inner
// thoughts) plus a final answer that follows the four steps requested by the user.

const systemPrompt = `你是一个负责排查网页性能问题的资深工程师。请使用 Chain-of-Thought（连锁思维）在内部系统性地分析问题，但不要直接输出逐字的内在思考过程。输出格式严格分为两部分：\n\n1) Reasoning Summary: 一段简短（最多 6 行）的、对思考过程要点的概述（这是对链式思考的摘要，而不是逐字的思路）。\n\n2) Final Answer: 针对问题“如果一个网页加载速度慢，该如何处理”，按照下列四个步骤给出清晰、可操作的建议：\n   a) 性能监控：如何确定页面是否慢以及慢多少（要列出工具/指标/具体量化方法）；\n   b) 性能数据分析：要分析哪些数据（前端/后端/网络/资源），如何定位是哪个环节有问题；\n   c) 找到瓶颈后：分析可能的原因并列出可行的解决方案（列出优先级/成本/风险）；\n   d) 解决问题：给出实施建议和验证方法（如何回归测试、监控验证）。\n\n要求：回答应简洁、结构化、可操作。避免漫无目的的发挥或冗长的私下推理输出。所有建议面向通用 Web 应用（静态站点或动态站点均适用）。`;

const humanPromptTemplate = `请基于上述系统角色，回答用户问题：\n\n问题：如果一个网页加载速度慢，该如何处理？\n\n请严格返回两个部分：\n- Reasoning Summary: <短摘要>\n- Final Answer: <分步骤、条理清晰的操作性建议>\n\n只需输出这两个部分，不要输出其他内容。`;

const messages = [
  new SystemMessage(systemPrompt),
  new HumanMessage(humanPromptTemplate),
];

(async () => {
  try {
    const res = await llm.invoke(messages);
    // Print the content returned by the model
    console.log(res.content);
  } catch (err) {
    console.error("Error invoking LLM:", err);
  }
})();
