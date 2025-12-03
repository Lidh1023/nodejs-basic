/**
 * LangChain Chain 与 Pipe 学习 Demo
 *
 * 本示例演示如何：
 * 1. pipe 的基本使用 - 组合 Prompt、LLM、OutputParser
 * 2. chain 的流式输出 (Stream)
 * 3. 串行任务 (Sequential Chain)
 * 4. 并行任务 (Parallel Chain / RunnableParallel)
 *
 * 🎯 核心概念：
 * - Runnable: LangChain 中的可执行单元，支持 invoke、stream、batch 等方法
 * - pipe(): 将多个 Runnable 串联起来，前一个的输出作为后一个的输入
 * - RunnableSequence: 串行执行的 Chain
 * - RunnableParallel: 并行执行的 Chain
 */

import { ChatDeepSeek } from "@langchain/deepseek";
import { ChatPromptTemplate, PromptTemplate } from "@langchain/core/prompts";
import {
  StringOutputParser,
  JsonOutputParser,
} from "@langchain/core/output_parsers";
import {
  RunnableSequence,
  RunnableParallel,
  RunnablePassthrough,
} from "@langchain/core/runnables";
import "dotenv/config";

// 初始化 LLM
const llm = new ChatDeepSeek({
  model: "deepseek-chat",
  temperature: 0.7,
});

// ============================================
// 示例 1: Pipe 的基本使用
// ============================================

console.log(
  "╔════════════════════════════════════════════════════════════════╗"
);
console.log(
  "║         示例 1: Pipe 的基本使用 - 组合 Prompt + LLM            ║"
);
console.log(
  "╚════════════════════════════════════════════════════════════════╝\n"
);

/**
 * pipe() 方法是 LangChain 中最核心的组合方式
 * 它将多个 Runnable 组件串联起来，形成一个处理管道
 *
 * 基本流程：input → Prompt → LLM → OutputParser → output
 */

// 创建一个简单的翻译 Prompt
const translatePrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "你是一个专业的翻译助手，请将用户输入的 {source_lang} 文本翻译成 {target_lang}。",
  ],
  ["human", "{text}"],
]);

// 使用 pipe() 组合成 Chain
// StringOutputParser 将 AI 的消息对象转换为纯字符串
const translateChain = translatePrompt.pipe(llm).pipe(new StringOutputParser());

console.log("📌 Chain 结构: Prompt → LLM → StringOutputParser\n");

// 调用 Chain
const result1 = await translateChain.invoke({
  source_lang: "English",
  target_lang: "中文",
  text: "LangChain is a powerful framework for building AI applications.",
});

console.log(
  "输入文本: LangChain is a powerful framework for building AI applications."
);
console.log("翻译结果:", result1);
console.log("\n" + "─".repeat(60) + "\n");

// ============================================
// 示例 2: Chain 的流式输出 (Stream)
// ============================================

console.log(
  "╔════════════════════════════════════════════════════════════════╗"
);
console.log(
  "║              示例 2: Chain 的流式输出 (Stream)                 ║"
);
console.log(
  "╚════════════════════════════════════════════════════════════════╝\n"
);

/**
 * 流式输出 (Stream) 的优势：
 * 1. 实时显示生成内容，提升用户体验
 * 2. 减少用户等待感
 * 3. 支持大文本的分块处理
 *
 * 使用 chain.stream() 方法即可获得流式输出
 */

const storyPrompt = ChatPromptTemplate.fromMessages([
  ["system", "你是一个创意写作助手，善于编写简短有趣的故事。"],
  ["human", "请用 {language} 写一个关于 {topic} 的 50 字左右的小故事。"],
]);

const storyChain = storyPrompt.pipe(llm).pipe(new StringOutputParser());

console.log("📝 开始流式生成故事...\n");
console.log("主题: 程序员与 AI 的友谊");
console.log("─".repeat(40));

// 使用 stream() 方法获取流式输出
const stream = await storyChain.stream({
  language: "中文",
  topic: "程序员与 AI 的友谊",
});

// 遍历流，实时打印每个 chunk
for await (const chunk of stream) {
  process.stdout.write(chunk);
}

console.log("\n" + "─".repeat(40));
console.log("\n✅ 流式输出完成！\n");
console.log("─".repeat(60) + "\n");

// ============================================
// 示例 3: 串行任务 (Sequential Chain)
// ============================================

console.log(
  "╔════════════════════════════════════════════════════════════════╗"
);
console.log(
  "║         示例 3: 串行任务 - RunnableSequence                    ║"
);
console.log(
  "╚════════════════════════════════════════════════════════════════╝\n"
);

/**
 * 串行任务：多个步骤按顺序执行，每一步的输出作为下一步的输入
 *
 * 场景示例：
 * 1. 先生成文章标题
 * 2. 再根据标题生成文章内容
 * 3. 最后对文章进行总结
 *
 * 可以使用 RunnableSequence.from() 或连续 pipe() 实现
 */

console.log("📌 任务链: 生成标题 → 生成内容 → 生成总结\n");

// 步骤 1: 生成标题
const titlePrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "你是一个创意标题生成器，根据主题生成一个吸引人的文章标题。只输出标题，不要其他内容。",
  ],
  ["human", "主题: {topic}"],
]);

// 步骤 2: 根据标题生成内容
const contentPrompt = ChatPromptTemplate.fromMessages([
  ["system", "你是一个专业的内容创作者，请根据标题写一段 100 字左右的内容。"],
  ["human", "请根据以下标题写文章:\n标题: {title}"],
]);

// 步骤 3: 生成总结
const summaryPrompt = ChatPromptTemplate.fromMessages([
  ["system", "你是一个总结专家，请用一句话概括文章的核心观点。"],
  ["human", "请总结以下文章:\n{content}"],
]);

// 方式 1: 使用 RunnableSequence.from() 构建串行链
const sequentialChain = RunnableSequence.from([
  // 第一步：生成标题
  {
    title: titlePrompt.pipe(llm).pipe(new StringOutputParser()),
    topic: (input) => input.topic, // 保留原始 topic 供后续使用
  },
  // 第二步：生成内容
  {
    title: (input) => input.title,
    content: RunnableSequence.from([
      (input) => ({ title: input.title }),
      contentPrompt,
      llm,
      new StringOutputParser(),
    ]),
  },
  // 第三步：生成总结
  {
    title: (input) => input.title,
    content: (input) => input.content,
    summary: RunnableSequence.from([
      (input) => ({ content: input.content }),
      summaryPrompt,
      llm,
      new StringOutputParser(),
    ]),
  },
]);

console.log("🚀 开始执行串行任务链...\n");

const sequentialResult = await sequentialChain.invoke({
  topic: "人工智能如何改变程序员的工作方式",
});

console.log("📝 生成结果:");
console.log("─".repeat(40));
console.log("📌 标题:", sequentialResult.title);
console.log("─".repeat(40));
console.log("📄 内容:", sequentialResult.content);
console.log("─".repeat(40));
console.log("📋 总结:", sequentialResult.summary);
console.log("─".repeat(40));

console.log("\n✅ 串行任务完成！\n");
console.log("─".repeat(60) + "\n");

// ============================================
// 示例 4: 并行任务 (RunnableParallel)
// ============================================

console.log(
  "╔════════════════════════════════════════════════════════════════╗"
);
console.log(
  "║         示例 4: 并行任务 - RunnableParallel                    ║"
);
console.log(
  "╚════════════════════════════════════════════════════════════════╝\n"
);

/**
 * 并行任务：多个任务同时执行，互不依赖，最终合并结果
 *
 * 优势：
 * 1. 提高执行效率，减少总耗时
 * 2. 适合不相互依赖的多任务场景
 *
 * 使用 RunnableParallel 或对象字面量语法
 */

console.log("📌 并行任务: 同时进行 情感分析、关键词提取、语言检测\n");

// 定义三个并行的分析任务
const sentimentPrompt = ChatPromptTemplate.fromMessages([
  ["system", "分析以下文本的情感倾向，只输出：积极/消极/中性"],
  ["human", "{text}"],
]);

const keywordsPrompt = ChatPromptTemplate.fromMessages([
  ["system", "提取以下文本的 3 个核心关键词，用逗号分隔，只输出关键词"],
  ["human", "{text}"],
]);

const languagePrompt = ChatPromptTemplate.fromMessages([
  ["system", "检测以下文本的语言，只输出语言名称（如：中文、英文、日文）"],
  ["human", "{text}"],
]);

// 使用 RunnableParallel 创建并行任务
const parallelChain = RunnableParallel.from({
  sentiment: sentimentPrompt.pipe(llm).pipe(new StringOutputParser()),
  keywords: keywordsPrompt.pipe(llm).pipe(new StringOutputParser()),
  language: languagePrompt.pipe(llm).pipe(new StringOutputParser()),
});

const testText =
  "LangChain 是一个非常强大的框架，它让 AI 应用开发变得简单高效，我非常喜欢使用它！";

console.log("待分析文本:", testText);
console.log("\n🚀 开始并行执行三个分析任务...\n");

const startTime = Date.now();
const parallelResult = await parallelChain.invoke({ text: testText });
const endTime = Date.now();

console.log("📊 分析结果:");
console.log("─".repeat(40));
console.log("😊 情感倾向:", parallelResult.sentiment);
console.log("🔑 关键词:", parallelResult.keywords);
console.log("🌍 语言:", parallelResult.language);
console.log("─".repeat(40));
console.log(`⏱️  并行执行总耗时: ${endTime - startTime}ms`);

console.log("\n✅ 并行任务完成！\n");
console.log("─".repeat(60) + "\n");

// ============================================
// 示例 5: RunnablePassthrough - 数据透传
// ============================================

console.log(
  "╔════════════════════════════════════════════════════════════════╗"
);
console.log(
  "║         示例 5: RunnablePassthrough - 数据透传                 ║"
);
console.log(
  "╚════════════════════════════════════════════════════════════════╝\n"
);

/**
 * RunnablePassthrough 的作用：
 * 1. 在并行任务中保留原始输入
 * 2. 将输入原样传递给下一个 Runnable
 *
 * 常见场景：需要同时访问原始输入和处理后的结果
 */

console.log("📌 场景: 翻译文本并保留原文\n");

const translateOnlyPrompt = ChatPromptTemplate.fromMessages([
  ["system", "将以下文本翻译成英文，只输出翻译结果"],
  ["human", "{text}"],
]);

// 使用 RunnablePassthrough 保留原始输入
const translateWithOriginal = RunnableParallel.from({
  original: new RunnablePassthrough(), // 原样传递输入
  translated: translateOnlyPrompt.pipe(llm).pipe(new StringOutputParser()),
});

const chineseText = { text: "人工智能正在改变世界" };
console.log("输入:", chineseText);
console.log("\n🔄 执行翻译并保留原文...\n");

const passthroughResult = await translateWithOriginal.invoke(chineseText);

console.log("📝 结果:");
console.log("─".repeat(40));
console.log("原文:", passthroughResult.original.text);
console.log("译文:", passthroughResult.translated);
console.log("─".repeat(40));

console.log("\n✅ 数据透传示例完成！\n");
console.log("─".repeat(60) + "\n");

// ============================================
// 示例 6: 复杂链的组合 - 串行 + 并行
// ============================================

console.log(
  "╔════════════════════════════════════════════════════════════════╗"
);
console.log(
  "║       示例 6: 复杂链组合 - 串行 + 并行混合使用                 ║"
);
console.log(
  "╚════════════════════════════════════════════════════════════════╝\n"
);

/**
 * 实际应用中，往往需要串行和并行的混合使用
 *
 * 示例场景：
 * 1. 先对输入进行预处理（串行）
 * 2. 然后并行执行多个分析任务
 * 3. 最后汇总所有结果（串行）
 */

console.log(
  "📌 流程: 输入 → 翻译成英文 → 并行(情感分析 + 关键词提取) → 汇总报告\n"
);

// 步骤 1: 翻译预处理
const preProcessPrompt = ChatPromptTemplate.fromMessages([
  ["system", "将以下中文翻译成英文，只输出翻译结果"],
  ["human", "{input}"],
]);

// 步骤 2: 并行分析
const engSentimentPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "Analyze the sentiment of the text. Output only: Positive/Negative/Neutral",
  ],
  ["human", "{text}"],
]);

const engKeywordsPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "Extract 3 keywords from the text. Output only keywords separated by commas",
  ],
  ["human", "{text}"],
]);

// 步骤 3: 汇总报告
const reportPrompt = ChatPromptTemplate.fromMessages([
  ["system", "根据以下分析结果，生成一份简短的中文分析报告（50字以内）"],
  [
    "human",
    `原文: {original}
翻译: {translated}
情感: {sentiment}
关键词: {keywords}`,
  ],
]);

// 构建复杂链
const complexChain = RunnableSequence.from([
  // 步骤 1: 预处理 - 翻译
  {
    original: (input) => input.input,
    translated: preProcessPrompt.pipe(llm).pipe(new StringOutputParser()),
  },
  // 步骤 2: 并行分析
  {
    original: (input) => input.original,
    translated: (input) => input.translated,
    analysis: RunnableParallel.from({
      sentiment: RunnableSequence.from([
        (input) => ({ text: input.translated }),
        engSentimentPrompt,
        llm,
        new StringOutputParser(),
      ]),
      keywords: RunnableSequence.from([
        (input) => ({ text: input.translated }),
        engKeywordsPrompt,
        llm,
        new StringOutputParser(),
      ]),
    }),
  },
  // 步骤 3: 汇总报告
  RunnableSequence.from([
    (input) => ({
      original: input.original,
      translated: input.translated,
      sentiment: input.analysis.sentiment,
      keywords: input.analysis.keywords,
    }),
    reportPrompt,
    llm,
    new StringOutputParser(),
  ]),
]);

const complexInput = "我今天学习了 LangChain 的链式调用，收获满满，太开心了！";
console.log("输入文本:", complexInput);
console.log("\n🚀 开始执行复杂链...\n");

const complexStartTime = Date.now();
const complexResult = await complexChain.invoke({ input: complexInput });
const complexEndTime = Date.now();

console.log("📊 分析报告:");
console.log("─".repeat(40));
console.log(complexResult);
console.log("─".repeat(40));
console.log(`⏱️  总耗时: ${complexEndTime - complexStartTime}ms`);

console.log("\n✅ 复杂链执行完成！\n");
console.log("─".repeat(60) + "\n");

// ============================================
// 示例 7: 流式输出复杂链
// ============================================

console.log(
  "╔════════════════════════════════════════════════════════════════╗"
);
console.log(
  "║            示例 7: 流式输出复杂链结果                          ║"
);
console.log(
  "╚════════════════════════════════════════════════════════════════╝\n"
);

/**
 * 即使是复杂的链也可以支持流式输出
 * streamEvents() 或 stream() 可以获取整个链的执行过程
 */

const streamChain = RunnableSequence.from([
  ChatPromptTemplate.fromMessages([
    ["system", "你是一个技术博主，善于用通俗易懂的语言解释技术概念"],
    ["human", "请用 100 字左右解释什么是 {concept}"],
  ]),
  llm,
  new StringOutputParser(),
]);

console.log("📝 流式输出解释 'LangChain Pipe'...\n");
console.log("─".repeat(40));

const conceptStream = await streamChain.stream({
  concept: "LangChain 的 Pipe 机制",
});

for await (const chunk of conceptStream) {
  process.stdout.write(chunk);
}

console.log("\n" + "─".repeat(40));
console.log("\n✅ 流式输出完成！\n");

// ============================================
// 知识点总结
// ============================================

console.log(`
╔════════════════════════════════════════════════════════════════╗
║               📚 LangChain Chain & Pipe 知识点总结              ║
╚════════════════════════════════════════════════════════════════╝

✨ 核心概念
─────────────────────────────────────────────────────────────────
1. Runnable: LangChain 中的可执行单元接口
   - invoke(): 同步执行
   - stream(): 流式执行
   - batch(): 批量执行

2. pipe(): 将多个 Runnable 串联
   - prompt.pipe(llm).pipe(parser)
   - 前一个的输出自动作为后一个的输入

3. RunnableSequence: 串行执行链
   - RunnableSequence.from([...])
   - 按顺序执行，支持中间数据传递

4. RunnableParallel: 并行执行链
   - RunnableParallel.from({...})
   - 同时执行多个任务，合并结果

5. RunnablePassthrough: 数据透传
   - 保留原始输入
   - 在复杂链中传递数据

🎯 使用场景
─────────────────────────────────────────────────────────────────
✅ pipe() 基础组合: Prompt → LLM → OutputParser
✅ 串行任务: 生成标题 → 生成内容 → 生成总结
✅ 并行任务: 同时进行多维度分析
✅ 混合使用: 预处理 → 并行分析 → 汇总报告

💡 最佳实践
─────────────────────────────────────────────────────────────────
1. 使用 StringOutputParser 简化输出处理
2. 复杂任务拆分成小步骤，用 pipe 组合
3. 无依赖的任务使用 RunnableParallel 提升效率
4. 使用 stream() 改善用户体验
5. 合理设计数据流，使用 RunnablePassthrough 保留必要数据

🔗 链式调用流程图
─────────────────────────────────────────────────────────────────

[串行 Sequential]
  Input → Step1 → Step2 → Step3 → Output

[并行 Parallel]
  Input ──┬── Task1 ──┐
          ├── Task2 ──┼── Merged Output
          └── Task3 ──┘

[混合 Hybrid]
  Input → Preprocess ──┬── Analysis1 ──┐
                       └── Analysis2 ──┴── Summary → Output

╚════════════════════════════════════════════════════════════════╝
`);

console.log("\n✅ 所有示例运行完成！");
console.log("💡 下一步建议:");
console.log("  1. 尝试修改示例中的 Prompt，观察输出变化");
console.log("  2. 创建自己的串行/并行链解决实际问题");
console.log("  3. 使用 streamEvents() 获取更详细的执行过程");
console.log("  4. 结合 Tools 实现更复杂的 Agent 流程");
console.log(
  "\n📚 推荐使用 Trae 编辑器运行和调试本示例，获得更好的开发体验！\n"
);
