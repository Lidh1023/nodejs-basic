# LangChain Chain & Pipe 知识点详解

> 🎯 本文将带你深入理解 LangChain 中的 Chain 和 Pipe 机制，通过实际代码示例掌握串行、并行、流式输出等核心技能。

## 📚 核心概念

### 什么是 Runnable？

`Runnable` 是 LangChain 中的核心接口，所有可执行的组件都实现了这个接口：

- **Prompt Template** - 提示词模板
- **LLM / ChatModel** - 语言模型
- **Output Parser** - 输出解析器
- **Chain** - 链（本身也是 Runnable）

每个 Runnable 都支持以下方法：

| 方法       | 说明     | 使用场景     |
| ---------- | -------- | ------------ |
| `invoke()` | 同步执行 | 普通调用     |
| `stream()` | 流式执行 | 实时输出     |
| `batch()`  | 批量执行 | 处理多个输入 |

### 什么是 Pipe？

`pipe()` 是连接多个 Runnable 的方法，将前一个组件的输出作为后一个组件的输入：

```javascript
// 基本用法
const chain = prompt.pipe(llm).pipe(outputParser);

// 等价于
// input → prompt → llm → outputParser → output
```

### Pipe 可接收的参数类型

`pipe()` 方法可以接收任何 **Runnable** 类型的对象，包括：

| 类型                  | 说明                         | 常见示例                                                                        |
| --------------------- | ---------------------------- | ------------------------------------------------------------------------------- |
| **Prompt Templates**  | 提示词模板                   | `ChatPromptTemplate`, `PromptTemplate`                                          |
| **LLMs / ChatModels** | 语言模型                     | `ChatDeepSeek`, `ChatOpenAI`, `ChatAnthropic`                                   |
| **Output Parsers**    | 输出解析器                   | `StringOutputParser`, `JsonOutputParser`, `StructuredOutputParser`              |
| **Runnable 组合器**   | 组合多个 Runnable            | `RunnableSequence`, `RunnableParallel`, `RunnablePassthrough`, `RunnableLambda` |
| **函数 (Function)**   | 自动包装为 RunnableLambda    | 普通函数、箭头函数、async 函数                                                  |
| **其他 Runnable**     | 任何实现 Runnable 接口的对象 | Tools, Retrievers, 自定义 Runnable                                              |

#### 示例：不同类型参数的使用

```javascript
import { RunnableLambda } from "@langchain/core/runnables";

// 1. 最常见：Prompt → LLM → OutputParser
const basicChain = prompt.pipe(llm).pipe(new StringOutputParser());

// 2. 使用函数（自动包装为 RunnableLambda）
const chainWithFunction = prompt
  .pipe(llm)
  .pipe(new StringOutputParser())
  .pipe((text) => text.toUpperCase()); // 普通函数

// 3. 使用 async 函数
const chainWithAsync = prompt
  .pipe(llm)
  .pipe(new StringOutputParser())
  .pipe(async (text) => {
    // 可以在这里做异步操作
    return `处理后: ${text}`;
  });

// 4. 使用 RunnableLambda 显式包装
const customRunnable = new RunnableLambda({
  func: (input) => `[${input}]`,
});
const chainWithLambda = prompt
  .pipe(llm)
  .pipe(new StringOutputParser())
  .pipe(customRunnable);

// 5. 嵌套使用其他 Chain
const innerChain = prompt2.pipe(llm).pipe(new StringOutputParser());
const outerChain = prompt1
  .pipe(llm)
  .pipe(new StringOutputParser())
  .pipe(innerChain);

// 6. 使用 RunnableParallel 进行分支
const branchChain = prompt
  .pipe(llm)
  .pipe(new StringOutputParser())
  .pipe(
    RunnableParallel.from({
      upper: (text) => text.toUpperCase(),
      lower: (text) => text.toLowerCase(),
      length: (text) => text.length,
    })
  );
```

#### 类型匹配规则

> ⚠️ **重要**：`pipe()` 连接时，**前一个 Runnable 的输出类型必须与后一个 Runnable 的输入类型兼容**。

```javascript
// ✅ 正确：LLM 输出 AIMessage → StringOutputParser 接收 AIMessage
prompt.pipe(llm).pipe(new StringOutputParser());

// ✅ 正确：StringOutputParser 输出 string → 函数接收 string
prompt
  .pipe(llm)
  .pipe(new StringOutputParser())
  .pipe((text) => text.trim());

// ❌ 错误：LLM 输出 AIMessage → 函数期望 string
// prompt.pipe(llm).pipe((msg) => msg.trim()); // msg 是 AIMessage 对象，不是 string
```

---

## 🔧 示例详解

### 示例 1：Pipe 的基本使用

最基础的 Chain 组合：Prompt → LLM → OutputParser

```javascript
import { ChatDeepSeek } from "@langchain/deepseek";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import "dotenv/config";

// 初始化 LLM
const llm = new ChatDeepSeek({
  model: "deepseek-chat",
  temperature: 0.7,
});

// 创建 Prompt
const translatePrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "你是一个专业的翻译助手，请将 {source_lang} 翻译成 {target_lang}。",
  ],
  ["human", "{text}"],
]);

// 使用 pipe() 组合成 Chain
const translateChain = translatePrompt.pipe(llm).pipe(new StringOutputParser());

// 调用 Chain
const result = await translateChain.invoke({
  source_lang: "English",
  target_lang: "中文",
  text: "Hello, LangChain!",
});

console.log(result); // 你好，LangChain！
```

**要点解析：**

- `ChatPromptTemplate.fromMessages()` 创建聊天提示词模板
- `pipe()` 将组件串联起来
- `StringOutputParser` 将 AI 返回的消息对象转换为纯字符串
- `invoke()` 传入模板变量，执行整个链

---

### 示例 2：Stream 流式输出

流式输出可以实时显示 AI 生成的内容，提升用户体验：

```javascript
const storyPrompt = ChatPromptTemplate.fromMessages([
  ["system", "你是一个创意写作助手"],
  ["human", "请写一个关于 {topic} 的小故事"],
]);

const storyChain = storyPrompt.pipe(llm).pipe(new StringOutputParser());

// 使用 stream() 获取流式输出
const stream = await storyChain.stream({
  topic: "程序员与 AI",
});

// 实时打印每个 chunk
for await (const chunk of stream) {
  process.stdout.write(chunk);
}
```

**流式输出的优势：**

- ✅ 用户无需等待完整响应
- ✅ 实时看到生成过程
- ✅ 适合生成长文本
- ✅ 改善交互体验

---

### 示例 3：串行任务 (RunnableSequence)

当任务有依赖关系时，使用串行执行：

```javascript
import { RunnableSequence } from "@langchain/core/runnables";

// 步骤 1: 生成标题
const titleChain = titlePrompt.pipe(llm).pipe(new StringOutputParser());

// 步骤 2: 根据标题生成内容
const contentChain = contentPrompt.pipe(llm).pipe(new StringOutputParser());

// 串行组合
const sequentialChain = RunnableSequence.from([
  // 第一步：生成标题
  {
    title: titleChain,
    topic: (input) => input.topic,
  },
  // 第二步：生成内容（依赖标题）
  {
    title: (input) => input.title,
    content: RunnableSequence.from([
      (input) => ({ title: input.title }),
      contentChain,
    ]),
  },
]);

const result = await sequentialChain.invoke({ topic: "AI 学习" });
// result = { title: "...", content: "..." }
```

**串行任务特点：**

- 📌 任务按顺序执行
- 📌 后续任务可以使用前置任务的结果
- 📌 适合有依赖关系的多步骤流程

---

### 示例 4：并行任务 (RunnableParallel)

当多个任务互不依赖时，使用并行执行提升效率：

```javascript
import { RunnableParallel } from "@langchain/core/runnables";

// 定义三个独立的分析任务
const sentimentChain = sentimentPrompt.pipe(llm).pipe(new StringOutputParser());
const keywordsChain = keywordsPrompt.pipe(llm).pipe(new StringOutputParser());
const languageChain = languagePrompt.pipe(llm).pipe(new StringOutputParser());

// 并行组合
const parallelChain = RunnableParallel.from({
  sentiment: sentimentChain,
  keywords: keywordsChain,
  language: languageChain,
});

const result = await parallelChain.invoke({ text: "待分析的文本" });
// result = { sentiment: "积极", keywords: "...", language: "中文" }
```

**并行任务优势：**

- ⚡ 显著减少总执行时间
- ⚡ 充分利用 API 并发能力
- ⚡ 适合多维度分析场景

---

### 示例 5：RunnablePassthrough 数据透传

在复杂链中保留原始输入：

```javascript
import { RunnablePassthrough } from "@langchain/core/runnables";

const translateWithOriginal = RunnableParallel.from({
  original: new RunnablePassthrough(), // 原样传递
  translated: translateChain,
});

const result = await translateWithOriginal.invoke({ text: "Hello" });
// result = { original: { text: "Hello" }, translated: "你好" }
```

---

### 示例 6：串行 + 并行混合

实际项目中常需要组合使用：

```
输入 → 预处理(串行) → 多维分析(并行) → 汇总报告(串行) → 输出
```

```javascript
const complexChain = RunnableSequence.from([
  // 步骤 1: 预处理
  {
    original: (input) => input.text,
    processed: preprocessChain,
  },
  // 步骤 2: 并行分析
  {
    original: (input) => input.original,
    analysis: RunnableParallel.from({
      sentiment: sentimentChain,
      keywords: keywordsChain,
    }),
  },
  // 步骤 3: 汇总
  summaryChain,
]);
```

---

## 📊 核心对象速查表

| 对象                  | 作用               | 常用方法                    |
| --------------------- | ------------------ | --------------------------- |
| `ChatPromptTemplate`  | 创建聊天提示词模板 | `fromMessages()`            |
| `StringOutputParser`  | 将输出转为字符串   | 直接 `pipe()`               |
| `JsonOutputParser`    | 将输出解析为 JSON  | 直接 `pipe()`               |
| `RunnableSequence`    | 串行执行           | `from([...])`               |
| `RunnableParallel`    | 并行执行           | `from({...})`               |
| `RunnablePassthrough` | 数据透传           | `new RunnablePassthrough()` |

---

## 🎨 流程图解

### 基础 Pipe 流程

```
┌─────────┐    ┌─────────┐    ┌──────────────┐    ┌─────────┐
│  Input  │ → │ Prompt  │ → │     LLM      │ → │ Parser  │ → Output
└─────────┘    └─────────┘    └──────────────┘    └─────────┘
```

### 串行任务流程

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  Input  │ → │ Step 1  │ → │ Step 2  │ → │ Step 3  │ → Output
└─────────┘    └─────────┘    └─────────┘    └─────────┘
```

### 并行任务流程

```
                 ┌─────────┐
              ┌→ │ Task A  │ ─┐
┌─────────┐   │  └─────────┘  │   ┌──────────────┐
│  Input  │ ──┼→ ┌─────────┐  ├→ │ Merge Result │ → Output
└─────────┘   │  │ Task B  │  │   └──────────────┘
              │  └─────────┘  │
              └→ ┌─────────┐ ─┘
                 │ Task C  │
                 └─────────┘
```

---

## 💡 最佳实践

### 1. 合理选择执行方式

```javascript
// ❌ 错误：无依赖任务串行执行，浪费时间
const result1 = await chain1.invoke(input);
const result2 = await chain2.invoke(input);
const result3 = await chain3.invoke(input);

// ✅ 正确：无依赖任务并行执行
const results = await RunnableParallel.from({
  r1: chain1,
  r2: chain2,
  r3: chain3,
}).invoke(input);
```

### 2. 使用流式输出提升体验

```javascript
// ❌ 用户需要等待完整响应
const result = await chain.invoke(input);

// ✅ 实时显示生成内容
const stream = await chain.stream(input);
for await (const chunk of stream) {
  process.stdout.write(chunk);
}
```

### 3. 使用 OutputParser 简化处理

```javascript
// ❌ 手动提取内容
const response = await llm.invoke(prompt);
const text = response.content;

// ✅ 使用 Parser 自动处理
const chain = prompt.pipe(llm).pipe(new StringOutputParser());
const text = await chain.invoke(input);
```

---

## 🔗 相关资源

- [LangChain JS 官方文档](https://js.langchain.com/)
- [DeepSeek 开放平台](https://platform.deepseek.com/)
- [Trae_solo 官网](https://www.trae.ai/)
- [本项目 GitHub 地址](#)

---

## 📝 练习建议

1. **基础练习**：修改翻译 Chain，支持多种语言互译
2. **进阶练习**：创建一个并行分析 Chain，同时分析文本的情感、主题、风格
3. **综合练习**：实现一个"文章改写助手"，包含：分析原文 → 并行生成多个改写版本 → 评选最佳版本

---

## 🎯 总结

| 知识点                  | 核心要点                         |
| ----------------------- | -------------------------------- |
| **pipe()**              | 连接 Runnable 组件，构建处理管道 |
| **stream()**            | 流式输出，提升用户体验           |
| **RunnableSequence**    | 串行执行，处理有依赖的任务       |
| **RunnableParallel**    | 并行执行，提升处理效率           |
| **RunnablePassthrough** | 数据透传，保留原始输入           |

掌握这些核心概念后，你就可以灵活组合构建复杂的 AI 应用流程了！

---

> 📖 **本文配套代码**：`langchain-learning/src/chain.js`
>
> 💻 **推荐工具**：使用 [Trae_solo](https://www.trae.ai/) 获得更好的 AI 开发体验
>
> ✨ **Happy Coding!**
