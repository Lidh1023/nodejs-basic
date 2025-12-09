/**
 * LangGraph 函数式 API Agent - 最小示例
 */

import { entrypoint, task, getPreviousState } from "@langchain/langgraph";
import { ChatDeepSeek } from "@langchain/deepseek";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { HumanMessage, ToolMessage } from "@langchain/core/messages";
import { z } from "zod";
import "dotenv/config";

// 1. 工具
const tools = [
  new DynamicStructuredTool({
    name: "calculator",
    description: "数学计算",
    schema: z.object({ expression: z.string() }),
    func: async ({ expression }) =>
      `${expression} = ${Function(`return (${expression})`)()}`,
  }),
];
const toolsByName = Object.fromEntries(tools.map((t) => [t.name, t]));

// 2. LLM
const llm = new ChatDeepSeek({
  model: "deepseek-chat",
  temperature: 0,
}).bindTools(tools);

// 3. Task
const callLLM = task("callLLM", (messages) => llm.invoke(messages));

const runTool = task("runTool", async (call) => {
  const result = await toolsByName[call.name].invoke(call.args);
  return new ToolMessage({ tool_call_id: call.id, content: result });
});

// 4. Agent 入口
const agent = entrypoint("agent", async ({ question }) => {
  const prev = getPreviousState() ?? { messages: [] };
  let messages = [...prev.messages, new HumanMessage(question)];

  for (let i = 0; i < 5; i++) {
    const res = await callLLM(messages);
    messages.push(res);
    if (!res.tool_calls?.length) break;
    for (const call of res.tool_calls) messages.push(await runTool(call));
  }

  return { messages, answer: messages.at(-1).content };
});

// 5. 直接调用（不使用 compile）
for (const q of ["你好", "计算 (15+27)*3"]) {
  const { answer } = await agent.invoke(
    { question: q },
    { configurable: { thread_id: "1" } }
  );
  console.log(`Q: ${q}\nA: ${answer}\n`);
}
