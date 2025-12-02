# LangChain Tools 知识点详解

> 让 AI 拥有「双手」—— Tools 是 LangChain 中最强大的功能之一

[![LangChain](https://img.shields.io/badge/LangChain-v0.3-blue)](https://js.langchain.com/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

## 📖 前言

**你是否遇到过这些问题？**

- 🤔 让 AI 查询实时信息，它却说"我的知识截止到..."
- 🤔 让 AI 做精确计算，它却给出一个估算值
- 🤔 想让 AI 调用你的 API，却不知道从何下手

**LangChain Tools 就是解决这些问题的利器！**

本文将带你从零开始，系统学习 LangChain Tools 的使用方法。无论你是 AI 开发新手还是有经验的开发者，都能从中获得实用的知识和技巧。

### ✨ 本文特色

- 📚 **系统全面** - 从概念到实战，循序渐进
- 💻 **代码丰富** - 每个知识点都有可运行的示例
- 🔧 **真实案例** - 包含 TavilySearch 等真实 API 集成
- 🎯 **实战导向** - 提供完整的动手实践任务

---

## 🚀 快速开始 - 环境搭建（5 分钟）

> 在开始学习之前，让我们先搭建好开发环境，确保后面的每个案例都能运行！

### 第 1 步：安装 Trae 编辑器

[Trae](https://www.trae.ai/) 是字节跳动推出的 AI 原生 IDE，内置强大的 AI 助手，特别适合学习 AI 开发：

| 特性            | 说明                                |
| --------------- | ----------------------------------- |
| **AI 代码助手** | 内置 Claude/GPT，遇到问题可直接询问 |
| **智能补全**    | AI 驱动的代码补全，提高开发效率     |
| **中文友好**    | 完善的中文界面和 AI 中文对话支持    |
| **完全免费**    | 个人版免费使用，无需付费            |

**安装步骤：**

1. 访问 [https://www.trae.ai/](https://www.trae.ai/)
2. 下载并安装 Trae 编辑器（支持 Mac/Windows）
3. 打开 Trae，登录账号

### 第 2 步：创建项目

打开 Trae，创建一个新的文件夹作为学习项目：

```bash
# 创建项目文件夹
mkdir langchain-tools-demo
cd langchain-tools-demo

# 初始化 Node.js 项目
npm init -y
```

### 第 3 步：安装依赖

在 Trae 终端（快捷键 `` Ctrl + ` `` 或 `` Cmd + ` ``）中执行：

```bash
npm install @langchain/core @langchain/deepseek zod dotenv
```

**依赖说明：**

| 包名                  | 作用                                 |
| --------------------- | ------------------------------------ |
| `@langchain/core`     | LangChain 核心库，包含 Tool 相关 API |
| `@langchain/deepseek` | DeepSeek 大模型集成                  |
| `zod`                 | Schema 验证库，用于定义工具参数      |
| `dotenv`              | 环境变量管理                         |

### 第 4 步：配置环境变量

在项目根目录创建 `.env` 文件：

```bash
# DeepSeek API Key（必需）
# 获取地址: https://platform.deepseek.com/
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxx
```

> 💡 **如何获取 DeepSeek API Key？**
>
> 1. 访问 [https://platform.deepseek.com/](https://platform.deepseek.com/)
> 2. 注册并登录账号
> 3. 在 API Keys 页面创建新的 Key
> 4. 新用户赠送免费额度，足够学习使用

### 第 5 步：配置 package.json

修改 `package.json`，添加 ES Module 支持：

```json
{
  "name": "langchain-tools-demo",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "dependencies": {
    "@langchain/core": "^1.1.0",
    "@langchain/deepseek": "^1.0.2",
    "dotenv": "^17.0.0",
    "zod": "^3.23.0"
  }
}
```

### 第 6 步：创建第一个测试文件

创建 `test-setup.js` 验证环境：

```javascript
import { ChatDeepSeek } from "@langchain/deepseek";
import "dotenv/config";

// 测试 LLM 连接
const llm = new ChatDeepSeek({
  model: "deepseek-chat",
  temperature: 0,
});

const response = await llm.invoke("你好，请用一句话介绍自己");
console.log("✅ 环境配置成功！");
console.log("AI 回复:", response.content);
```

运行测试：

```bash
node test-setup.js
```

如果看到 AI 的回复，说明环境配置成功！🎉

### 环境问题排查

| 问题                       | 解决方案                                        |
| -------------------------- | ----------------------------------------------- |
| `Cannot find module`       | 运行 `npm install` 安装依赖                     |
| `DEEPSEEK_API_KEY not set` | 检查 `.env` 文件是否存在且格式正确              |
| `ERR_MODULE_NOT_FOUND`     | 检查 `package.json` 中是否有 `"type": "module"` |
| 网络连接错误               | 检查网络，DeepSeek API 需要能访问外网           |

---

## 📚 目录

- [什么是 Tools？](#什么是-tools)
- [为什么需要 Tools？](#为什么需要-tools)
- [Tools 的核心概念](#tools-的核心概念)
- [创建自定义 Tool](#创建自定义-tool)
- [工具绑定与调用](#工具绑定与调用)
- [完整的工具调用循环](#完整的工具调用循环)
- [LangChain 内置工具 - TavilySearch](#langchain-内置工具---tavilysearch)
- [Agent 智能代理（进阶）](#agent-智能代理进阶)
- [实战案例分析](#实战案例分析)
- [最佳实践](#最佳实践)
- [常见问题 FAQ](#常见问题-faq)

---

## 什么是 Tools？

### 🤔 一句话解释

**Tools 是让大语言模型能够调用外部功能（如查询数据、执行计算、调用 API）的机制。**

### 形象比喻

想象你是一个非常聪明的人（AI），但你：

- ❌ 不知道现在几点（没有实时信息）
- ❌ 算不了复杂数学（只能粗略估算）
- ❌ 查不了数据库（没有访问权限）

**Tools 就像给你配备了：**

- ⏰ 一块手表（查询时间工具）
- 🧮 一个计算器（数学计算工具）
- 💾 一个数据库终端（数据查询工具）

现在你可以通过这些"工具"来完成原本做不到的事情！

---

## 为什么需要 Tools？

### LLM 的天然局限性

| 局限性           | 说明                                 | Tools 如何解决           |
| ---------------- | ------------------------------------ | ------------------------ |
| **知识截止日期** | 训练数据有时间限制，无法获取最新信息 | 通过搜索工具获取实时信息 |
| **无法执行计算** | 只能估算，不能精确计算               | 调用计算器工具           |
| **无法访问数据** | 无法查询数据库或调用 API             | 通过数据查询工具访问     |
| **无法执行操作** | 不能发送邮件、修改文件等             | 通过操作类工具执行       |

### 没有 Tools vs 有 Tools

#### ❌ 没有 Tools

```
用户: 北京今天天气怎么样？
AI: 抱歉，我无法获取实时天气信息。建议你访问天气预报网站...
```

#### ✅ 有 Tools

```
用户: 北京今天天气怎么样？
AI: [调用天气工具]
    → 获取到: 北京今天晴朗，温度 15°C，湿度 45%

回答: 北京今天天气晴朗，温度 15°C，湿度 45%，适合出行！
```

---

## Tools 的核心概念

### 1. Tool 的四要素

```javascript
const myTool = new DynamicStructuredTool({
  // 1️⃣ 名称 - AI 用来识别工具
  name: "get_weather",

  // 2️⃣ 描述 - 告诉 AI 什么时候使用这个工具
  description: "获取指定城市的天气信息。当用户询问天气时使用此工具。",

  // 3️⃣ 参数 Schema - 定义工具需要什么输入
  schema: z.object({
    city: z.string().describe("城市名称"),
    unit: z.enum(["celsius", "fahrenheit"]).optional(),
  }),

  // 4️⃣ 执行函数 - 工具的实际逻辑
  func: async ({ city, unit }) => {
    // 调用天气 API
    const weather = await fetchWeather(city);
    return JSON.stringify(weather);
  },
});
```

### 2. Tool 的工作流程

```
┌─────────────┐
│  用户提问    │ "北京天气怎么样？"
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  AI 分析     │ 需要调用 get_weather 工具
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Tool 调用   │ get_weather({ city: "北京" })
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  返回结果    │ { temp: 15, condition: "晴" }
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  AI 整合答案 │ "北京今天晴朗，15°C"
└─────────────┘
```

### 3. Tool 的类型

| 类型           | 类名                    | 适用场景                       |
| -------------- | ----------------------- | ------------------------------ |
| **结构化工具** | `DynamicStructuredTool` | 需要明确参数定义的工具（推荐） |
| **简单工具**   | `Tool`                  | 参数简单的工具（较少使用）     |
| **内置工具**   | 如 `Calculator`         | 使用 LangChain 提供的现成工具  |

---

## 创建自定义 Tool

### 示例 1: 天气查询工具

```javascript
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

const weatherTool = new DynamicStructuredTool({
  name: "get_weather",
  description: "获取指定城市的天气信息。当用户询问天气时使用此工具。",

  schema: z.object({
    city: z.string().describe("城市名称，例如：北京、上海、深圳"),
    unit: z.enum(["celsius", "fahrenheit"]).optional().describe("温度单位"),
  }),

  func: async ({ city, unit = "celsius" }) => {
    // 实际应用中这里会调用真实的天气 API
    const weatherData = {
      北京: { temp: 15, condition: "晴朗", humidity: 45 },
      上海: { temp: 20, condition: "多云", humidity: 65 },
    };

    const data = weatherData[city] || {
      temp: 22,
      condition: "未知",
      humidity: 50,
    };

    return JSON.stringify({
      city: city,
      temperature: `${data.temp}°C`,
      condition: data.condition,
      humidity: `${data.humidity}%`,
    });
  },
});
```

### 示例 2: 计算器工具

```javascript
const calculatorTool = new DynamicStructuredTool({
  name: "calculator",
  description: "执行数学计算。支持加减乘除、幂运算等。",

  schema: z.object({
    expression: z.string().describe("数学表达式，例如: '2 + 3 * 4'"),
  }),

  func: async ({ expression }) => {
    try {
      // 生产环境应使用 math.js 等安全的库
      const result = Function(`"use strict"; return (${expression})`)();
      return `计算结果: ${expression} = ${result}`;
    } catch (error) {
      return `计算错误: ${error.message}`;
    }
  },
});
```

### 示例 3: 数据库查询工具

```javascript
const databaseTool = new DynamicStructuredTool({
  name: "query_database",
  description: "查询用户数据库。可以根据用户 ID 或邮箱查询用户信息。",

  schema: z.object({
    query_type: z.enum(["by_id", "by_email"]).describe("查询类型"),
    value: z.string().describe("查询值：ID 或邮箱"),
  }),

  func: async ({ query_type, value }) => {
    // 模拟数据库查询
    const users = [
      { id: "001", email: "zhang@example.com", name: "张三" },
      { id: "002", email: "li@example.com", name: "李四" },
    ];

    let user;
    if (query_type === "by_id") {
      user = users.find((u) => u.id === value);
    } else {
      user = users.find((u) => u.email === value);
    }

    return user ? JSON.stringify(user) : "未找到用户";
  },
});
```

### 📝 实战练习 1：创建你的第一个工具

在项目中创建 `01-create-tool.js` 文件，完整代码如下：

```javascript
/**
 * 实战练习 1：创建自定义工具
 * 运行命令：node 01-create-tool.js
 */
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import "dotenv/config";

// 创建天气查询工具
const weatherTool = new DynamicStructuredTool({
  name: "get_weather",
  description: "获取指定城市的天气信息",
  schema: z.object({
    city: z.string().describe("城市名称"),
  }),
  func: async ({ city }) => {
    // 模拟天气数据
    const weatherData = {
      北京: { temp: 15, condition: "晴朗" },
      上海: { temp: 20, condition: "多云" },
      深圳: { temp: 28, condition: "小雨" },
    };
    const data = weatherData[city] || { temp: 25, condition: "未知" };
    return JSON.stringify({ city, ...data });
  },
});

// 创建计算器工具
const calculatorTool = new DynamicStructuredTool({
  name: "calculator",
  description: "执行数学计算",
  schema: z.object({
    expression: z.string().describe("数学表达式"),
  }),
  func: async ({ expression }) => {
    try {
      const result = Function(`"use strict"; return (${expression})`)();
      return `${expression} = ${result}`;
    } catch (e) {
      return `计算错误: ${e.message}`;
    }
  },
});

// 测试工具
console.log("🔧 测试天气工具:");
const weather = await weatherTool.invoke({ city: "北京" });
console.log(weather);

console.log("\n🔧 测试计算器工具:");
const calc = await calculatorTool.invoke({ expression: "2 + 3 * 4" });
console.log(calc);

console.log("\n✅ 工具创建成功！");
```

**运行测试：**

```bash
node 01-create-tool.js
```

**预期输出：**

```
🔧 测试天气工具:
{"city":"北京","temp":15,"condition":"晴朗"}

🔧 测试计算器工具:
2 + 3 * 4 = 14

✅ 工具创建成功！
```

---

## 工具绑定与调用

### 1. 绑定工具到 LLM

```javascript
import { ChatDeepSeek } from "@langchain/deepseek";

// 初始化 LLM
const llm = new ChatDeepSeek({
  model: "deepseek-chat",
  temperature: 0, // 工具调用建议使用低温度
});

// 定义工具列表
const tools = [weatherTool, calculatorTool, databaseTool];

// 绑定工具
const llmWithTools = llm.bindTools(tools);
```

### 2. 调用并检查工具请求

```javascript
// 用户提问
const response = await llmWithTools.invoke("北京今天天气怎么样？");

// 检查 AI 是否请求调用工具
if (response.tool_calls && response.tool_calls.length > 0) {
  console.log("AI 决定调用工具:");

  for (const toolCall of response.tool_calls) {
    console.log(`工具名称: ${toolCall.name}`);
    console.log(`参数:`, toolCall.args);

    // 找到对应的工具并执行
    const tool = tools.find((t) => t.name === toolCall.name);
    if (tool) {
      const result = await tool.invoke(toolCall.args);
      console.log(`工具返回:`, result);
    }
  }
} else {
  // AI 直接回答，无需工具
  console.log("AI 回答:", response.content);
}
```

### 3. 工具调用的完整流程

```javascript
// 完整示例：AI 自动选择并调用工具
async function askWithTools(question) {
  console.log(`🤔 用户: ${question}\n`);

  // 1. AI 分析问题并决定是否需要工具
  const response = await llmWithTools.invoke(question);

  // 2. 如果需要工具，执行工具调用
  if (response.tool_calls && response.tool_calls.length > 0) {
    const toolResults = [];

    for (const toolCall of response.tool_calls) {
      const tool = tools.find((t) => t.name === toolCall.name);
      if (tool) {
        const result = await tool.invoke(toolCall.args);
        toolResults.push({
          name: toolCall.name,
          result: result,
        });
      }
    }

    // 3. 将工具结果返回给 AI，让 AI 生成最终答案
    console.log("✅ 工具调用完成，结果:", toolResults);

    // 实际应用中，需要将工具结果传回 AI 继续对话
    // 这通常通过 Agent 自动完成（见下一节）
  } else {
    console.log("✅ AI 直接回答:", response.content);
  }
}

// 测试
await askWithTools("北京今天天气怎么样？");
await askWithTools("计算 123 * 456");
await askWithTools("你好");
```

### 📝 实战练习 2：AI 自动选择工具

创建 `02-bind-tools.js` 文件：

```javascript
/**
 * 实战练习 2：将工具绑定到 LLM
 * 运行命令：node 02-bind-tools.js
 */
import { ChatDeepSeek } from "@langchain/deepseek";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import "dotenv/config";

// 1. 创建工具
const weatherTool = new DynamicStructuredTool({
  name: "get_weather",
  description: "获取指定城市的天气信息。当用户询问天气时使用此工具。",
  schema: z.object({
    city: z.string().describe("城市名称"),
  }),
  func: async ({ city }) => {
    const data = { 北京: 15, 上海: 20, 深圳: 28 };
    return JSON.stringify({ city, temp: data[city] || 25, unit: "°C" });
  },
});

const calculatorTool = new DynamicStructuredTool({
  name: "calculator",
  description: "执行数学计算。当用户需要计算时使用此工具。",
  schema: z.object({
    expression: z.string().describe("数学表达式"),
  }),
  func: async ({ expression }) => {
    const result = Function(`"use strict"; return (${expression})`)();
    return `${expression} = ${result}`;
  },
});

// 2. 初始化 LLM 并绑定工具
const llm = new ChatDeepSeek({ model: "deepseek-chat", temperature: 0 });
const tools = [weatherTool, calculatorTool];
const llmWithTools = llm.bindTools(tools);

// 3. 测试 AI 自动选择工具
async function testToolSelection(question) {
  console.log(`\n🤔 用户: ${question}`);
  const response = await llmWithTools.invoke(question);

  if (response.tool_calls && response.tool_calls.length > 0) {
    console.log("🔧 AI 决定调用工具:");
    for (const tc of response.tool_calls) {
      console.log(`   工具: ${tc.name}, 参数:`, tc.args);
      const tool = tools.find((t) => t.name === tc.name);
      if (tool) {
        const result = await tool.invoke(tc.args);
        console.log(`   结果: ${result}`);
      }
    }
  } else {
    console.log("💬 AI 直接回答:", response.content);
  }
}

// 运行测试
await testToolSelection("北京今天天气怎么样？");
await testToolSelection("计算 15 * 8 + 20");
await testToolSelection("你好，介绍一下你自己");

console.log("\n✅ 测试完成！");
```

**运行测试：**

```bash
node 02-bind-tools.js
```

**观察要点：**

- AI 会根据问题自动选择合适的工具
- 询问天气时，AI 调用 `get_weather` 工具
- 需要计算时，AI 调用 `calculator` 工具
- 普通对话时，AI 直接回答，不调用工具

---

## 完整的工具调用循环

### 核心概念：ToolMessage

在 LangChain 中，完整的工具调用流程需要使用 `ToolMessage` 来将工具执行结果传回给 AI：

```javascript
import { HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
```

### 工具调用的完整流程

```
用户: "上海今天天气怎么样？"
    │
    ▼
┌────────────────────────────────────────┐
│ 第 1 步：发送用户消息给 AI              │
│ → messages = [HumanMessage("...")]     │
└───────────────┬────────────────────────┘
                │
                ▼
┌────────────────────────────────────────┐
│ 第 2 步：AI 分析并返回 tool_calls       │
│ → aiResponse.tool_calls = [...]        │
└───────────────┬────────────────────────┘
                │
                ▼
┌────────────────────────────────────────┐
│ 第 3 步：执行工具调用                   │
│ → result = await tool.invoke(args)     │
└───────────────┬────────────────────────┘
                │
                ▼
┌────────────────────────────────────────┐
│ 第 4 步：将工具结果包装为 ToolMessage   │
│ → messages.push(ToolMessage(...))      │
└───────────────┬────────────────────────┘
                │
                ▼
┌────────────────────────────────────────┐
│ 第 5 步：将所有消息发送给 AI            │
│ → AI 根据工具结果生成最终回答           │
└───────────────┬────────────────────────┘
                │
                ▼
最终回答: "上海今天天气多云，温度 20°C，湿度 65%。"
```

### 实现完整的工具调用循环

```javascript
import { HumanMessage, ToolMessage } from "@langchain/core/messages";

/**
 * 完整的工具调用流程：
 * 1. 用户提问
 * 2. AI 分析并返回 tool_calls
 * 3. 执行工具调用
 * 4. 将工具结果作为 ToolMessage 传回 AI
 * 5. AI 根据工具结果生成最终回答
 */
async function chatWithTools(question) {
  console.log(`🤔 用户: ${question}\n`);

  // 第 1 步：将用户问题发送给 AI
  const messages = [new HumanMessage(question)];
  const aiResponse = await llmWithTools.invoke(messages);

  // 第 2 步：检查 AI 是否需要调用工具
  if (aiResponse.tool_calls && aiResponse.tool_calls.length > 0) {
    console.log("🔧 AI 决定调用以下工具:");

    // 保存 AI 的响应（包含 tool_calls）
    messages.push(aiResponse);

    // 第 3 步：执行每个工具调用
    for (const toolCall of aiResponse.tool_calls) {
      console.log(`  - 工具: ${toolCall.name}`);
      console.log(`    参数:`, toolCall.args);

      const tool = tools.find((t) => t.name === toolCall.name);
      if (tool) {
        const result = await tool.invoke(toolCall.args);
        console.log(`    结果:`, result);

        // 第 4 步：将工具结果作为 ToolMessage 添加到消息列表
        messages.push(
          new ToolMessage({
            tool_call_id: toolCall.id,
            content: result,
          })
        );
      }
    }

    // 第 5 步：将所有消息（包括工具结果）发送给 AI，获取最终回答
    console.log("\n📝 AI 整合工具结果...\n");
    const finalResponse = await llmWithTools.invoke(messages);
    console.log("✅ AI 最终回答:", finalResponse.content);

    return finalResponse.content;
  } else {
    // AI 直接回答，无需工具
    console.log("✅ AI 直接回答:", aiResponse.content);
    return aiResponse.content;
  }
}

// 使用示例
await chatWithTools("上海今天天气怎么样？");
await chatWithTools("现在几点了？");
await chatWithTools("你好，介绍一下你自己"); // 无需工具
```

### ToolMessage 的关键属性

| 属性           | 说明                                |
| -------------- | ----------------------------------- |
| `tool_call_id` | 必须与 AI 返回的 `toolCall.id` 对应 |
| `content`      | 工具的执行结果（字符串）            |

### 为什么需要 ToolMessage？

1. **对话完整性**：让 AI 知道工具已执行并获取结果
2. **上下文连续**：AI 可以基于工具结果继续推理
3. **多工具支持**：通过 `tool_call_id` 匹配多个并行调用

### 📝 实战练习 3：完整的工具调用循环

创建 `03-tool-loop.js` 文件：

```javascript
/**
 * 实战练习 3：完整的工具调用循环
 * 运行命令：node 03-tool-loop.js
 */
import { ChatDeepSeek } from "@langchain/deepseek";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { HumanMessage, ToolMessage } from "@langchain/core/messages";
import { z } from "zod";
import "dotenv/config";

// 创建工具
const weatherTool = new DynamicStructuredTool({
  name: "get_weather",
  description: "获取城市天气",
  schema: z.object({ city: z.string() }),
  func: async ({ city }) => {
    const data = { 北京: "晴朗 15°C", 上海: "多云 20°C", 深圳: "小雨 28°C" };
    return data[city] || "未知城市";
  },
});

const timeTool = new DynamicStructuredTool({
  name: "get_time",
  description: "获取当前时间",
  schema: z.object({}),
  func: async () => new Date().toLocaleString("zh-CN"),
});

// 初始化
const llm = new ChatDeepSeek({ model: "deepseek-chat", temperature: 0 });
const tools = [weatherTool, timeTool];
const llmWithTools = llm.bindTools(tools);

// 完整的工具调用循环
async function chat(question) {
  console.log(`\n🤔 用户: ${question}\n`);

  // 第 1 步：发送问题
  const messages = [new HumanMessage(question)];
  const response = await llmWithTools.invoke(messages);

  // 第 2 步：检查是否需要工具
  if (response.tool_calls && response.tool_calls.length > 0) {
    console.log("🔧 调用工具中...");
    messages.push(response);

    // 第 3 步：执行工具
    for (const tc of response.tool_calls) {
      const tool = tools.find((t) => t.name === tc.name);
      if (tool) {
        const result = await tool.invoke(tc.args);
        console.log(`   ${tc.name}: ${result}`);

        // 第 4 步：添加 ToolMessage
        messages.push(
          new ToolMessage({
            tool_call_id: tc.id,
            content: result,
          })
        );
      }
    }

    // 第 5 步：获取最终回答
    const final = await llmWithTools.invoke(messages);
    console.log("\n✅ AI:", final.content);
    return final.content;
  }

  console.log("✅ AI:", response.content);
  return response.content;
}

// 测试
await chat("北京天气怎么样？");
await chat("现在几点了？");
await chat("你好");
```

**运行测试：**

```bash
node 03-tool-loop.js
```

**关键学习点：**

- `HumanMessage`：用户消息
- `ToolMessage`：工具结果消息，必须包含 `tool_call_id`
- AI 会整合工具结果，生成自然语言回答

---

## LangChain 内置工具 - TavilySearch

> 🔍 让 AI 拥有真正的互联网搜索能力

### 什么是 TavilySearch？

**TavilySearch** 是 LangChain 官方推荐的搜索工具，专为 AI Agent 设计。它是目前最适合与 LLM 配合使用的搜索引擎。

| 特性             | 说明                                          |
| ---------------- | --------------------------------------------- |
| **专为 AI 设计** | 返回结构化数据，便于 LLM 理解和处理           |
| **实时搜索**     | 获取互联网最新信息，突破 LLM 知识截止日期限制 |
| **免费额度**     | 每月 1000 次免费调用，足够学习和个人项目使用  |
| **易于集成**     | LangChain 原生支持，几行代码即可使用          |

### 获取 Tavily API Key

1. 访问 [https://tavily.com/](https://tavily.com/)
2. 点击 "Get API Key" 注册账号（支持 GitHub/Google 一键登录）
3. 在 Dashboard 中复制你的 API Key
4. 在项目根目录的 `.env` 文件中添加：

```bash
TAVILY_API_KEY=tvly-xxxxxxxxxxxxxxxxx
```

### 安装依赖

```bash
npm install @langchain/tavily
```

### 基础使用

```javascript
import { TavilySearch } from "@langchain/tavily";
import "dotenv/config";

// 创建 TavilySearch 工具实例
const tavilyTool = new TavilySearch({
  maxResults: 3, // 返回结果数量（1-10）
  // topic: "general",  // 可选: "general" | "news"
  // includeAnswer: true, // 可选: 是否包含 AI 生成的摘要
});

// 直接调用搜索（注意：需要传入对象格式）
const result = await tavilyTool.invoke({ query: "LangChain 最新版本特性" });
console.log(JSON.stringify(result, null, 2));
```

### 与 LLM 集成使用

```javascript
import { ChatDeepSeek } from "@langchain/deepseek";
import { TavilySearch } from "@langchain/tavily";
import { HumanMessage, ToolMessage } from "@langchain/core/messages";

// 初始化 LLM 和搜索工具
const llm = new ChatDeepSeek({ model: "deepseek-chat", temperature: 0 });
const tavilyTool = new TavilySearch({ maxResults: 3 });

// 绑定工具到 LLM
const llmWithSearch = llm.bindTools([tavilyTool]);

// 完整的搜索问答流程
async function searchAndAnswer(question) {
  const messages = [new HumanMessage(question)];
  const response = await llmWithSearch.invoke(messages);

  if (response.tool_calls && response.tool_calls.length > 0) {
    messages.push(response);

    for (const toolCall of response.tool_calls) {
      const result = await tavilyTool.invoke(toolCall.args);
      // TavilySearch 返回对象，需要转换为字符串
      const resultStr =
        typeof result === "string" ? result : JSON.stringify(result);
      messages.push(
        new ToolMessage({
          tool_call_id: toolCall.id,
          content: resultStr, // ToolMessage 的 content 必须是字符串
        })
      );
    }

    // AI 整合搜索结果生成最终答案
    const finalResponse = await llmWithSearch.invoke(messages);
    return finalResponse.content;
  }

  return response.content;
}

// 使用示例
const answer = await searchAndAnswer("2024年 AI 领域有哪些重大突破？");
console.log(answer);
```

### TavilySearch 配置选项

| 参数                | 类型    | 默认值    | 说明                            |
| ------------------- | ------- | --------- | ------------------------------- |
| `maxResults`        | number  | 5         | 返回结果数量（1-10）            |
| `topic`             | string  | "general" | 搜索主题："general" 或 "news"   |
| `includeAnswer`     | boolean | false     | 是否包含 AI 生成的摘要答案      |
| `includeRawContent` | boolean | false     | 是否包含原始网页内容            |
| `searchDepth`       | string  | "basic"   | 搜索深度："basic" 或 "advanced" |

### 为什么选择 TavilySearch？

| 对比项       | TavilySearch          | Google Search API | Bing Search API |
| ------------ | --------------------- | ----------------- | --------------- |
| **AI 优化**  | ✅ 专为 LLM 设计      | ❌ 通用搜索       | ❌ 通用搜索     |
| **免费额度** | ✅ 1000 次/月         | ❌ 需付费         | ⚠️ 有限免费     |
| **接入难度** | ✅ LangChain 原生支持 | ⚠️ 需要额外配置   | ⚠️ 需要额外配置 |
| **返回格式** | ✅ 结构化，LLM 友好   | ⚠️ 需要解析       | ⚠️ 需要解析     |

### 📝 实战练习 4：使用 TavilySearch 搜索实时信息

> ⚠️ 本练习需要 Tavily API Key，请先完成注册

**第 1 步：安装依赖**

```bash
npm install @langchain/tavily
```

**第 2 步：配置 API Key**

在 `.env` 文件中添加：

```bash
TAVILY_API_KEY=tvly-xxxxxxxxxxxxxxxx
```

**第 3 步：创建 `04-tavily-search.js` 文件**

```javascript
/**
 * 实战练习 4：TavilySearch 真实搜索
 * 运行命令：node 04-tavily-search.js
 */
import { ChatDeepSeek } from "@langchain/deepseek";
import { TavilySearch } from "@langchain/tavily";
import { HumanMessage, ToolMessage } from "@langchain/core/messages";
import "dotenv/config";

// 检查 API Key
if (!process.env.TAVILY_API_KEY) {
  console.log("❌ 请先配置 TAVILY_API_KEY");
  console.log("   获取地址: https://tavily.com/");
  process.exit(1);
}

// 创建搜索工具
const searchTool = new TavilySearch({ maxResults: 3 });

// 初始化 LLM
const llm = new ChatDeepSeek({ model: "deepseek-chat", temperature: 0 });
const llmWithSearch = llm.bindTools([searchTool]);

// 搜索并回答
async function searchAndAnswer(question) {
  console.log(`\n🔍 问题: ${question}\n`);

  const messages = [new HumanMessage(question)];
  const response = await llmWithSearch.invoke(messages);

  if (response.tool_calls && response.tool_calls.length > 0) {
    console.log("📡 搜索中...");
    messages.push(response);

    for (const tc of response.tool_calls) {
      const result = await searchTool.invoke(tc.args);
      const resultStr =
        typeof result === "string" ? result : JSON.stringify(result);
      console.log(
        `   找到 ${JSON.parse(resultStr).results?.length || 0} 条结果`
      );

      messages.push(
        new ToolMessage({ tool_call_id: tc.id, content: resultStr })
      );
    }

    const final = await llmWithSearch.invoke(messages);
    console.log("\n✅ AI 回答:", final.content);
    return final.content;
  }

  console.log("✅ AI 回答:", response.content);
  return response.content;
}

// 测试真实搜索
await searchAndAnswer("2024年诺贝尔物理学奖得主是谁？");
```

**运行测试：**

```bash
node 04-tavily-search.js
```

**如果没有 Tavily API Key**，可以跳过此练习，前面的练习已经涵盖了 Tools 的核心概念。

---

## Agent 智能代理（进阶）

> ⚠️ **注意**：在 LangChain.js v1.x 中，Agent 相关功能已迁移到 `@langchain/langgraph` 包。
>
> 如果你需要使用 Agent，请安装：`npm install @langchain/langgraph`

### 什么是 Agent？

**Agent** 是一个智能代理，它可以：

1. 🤔 **分析任务** - 理解用户需求
2. 🛠️ **选择工具** - 决定调用哪些工具
3. 🔄 **执行循环** - 自动调用工具、获取结果、再分析
4. 💬 **生成答案** - 整合所有信息，给出最终回答

### 手动实现 vs Agent

| 对比项       | 手动实现（推荐入门） | Agent（进阶）          |
| ------------ | -------------------- | ---------------------- |
| **依赖包**   | `@langchain/core`    | `@langchain/langgraph` |
| **工具选择** | 需要你编写逻辑       | AI 自动决定            |
| **循环调用** | 需要手动编写循环     | 自动执行多轮调用       |
| **学习曲线** | 低，更容易理解原理   | 高，抽象程度更高       |
| **适用场景** | 学习、简单任务       | 复杂的生产应用         |

### 学习建议

1. **先掌握手动实现**：理解工具调用的完整流程
2. **再学习 LangGraph**：用于构建复杂的 Agent 应用
3. **参考文档**：https://langchain-ai.github.io/langgraphjs/

---

## 实战案例分析

### 案例 1: 智能客服助手

**需求**: 创建一个客服助手，可以查询订单状态、退款信息、物流信息。

```javascript
import { HumanMessage, ToolMessage } from "@langchain/core/messages";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

// 工具 1: 查询订单
const orderTool = new DynamicStructuredTool({
  name: "query_order",
  description: "查询订单状态和详情",
  schema: z.object({
    order_id: z.string().describe("订单号"),
  }),
  func: async ({ order_id }) => {
    // 调用订单系统 API
    return JSON.stringify({
      order_id: order_id,
      status: "已发货",
      total: 299.0,
      items: ["iPhone 数据线", "充电器"],
    });
  },
});

// 工具 2: 查询物流
const logisticsTool = new DynamicStructuredTool({
  name: "query_logistics",
  description: "查询包裹物流信息",
  schema: z.object({
    tracking_number: z.string().describe("物流单号"),
  }),
  func: async ({ tracking_number }) => {
    return JSON.stringify({
      status: "运输中",
      location: "北京分拨中心",
      expected_delivery: "2025-12-05",
    });
  },
});

// 工具 3: 申请退款
const refundTool = new DynamicStructuredTool({
  name: "request_refund",
  description: "为订单申请退款",
  schema: z.object({
    order_id: z.string().describe("订单号"),
    reason: z.string().describe("退款原因"),
  }),
  func: async ({ order_id, reason }) => {
    // 调用退款系统
    return JSON.stringify({
      refund_id: "RF" + Date.now(),
      status: "已提交",
      message: "退款申请已提交，预计 3-5 个工作日处理完成",
    });
  },
});

// 创建客服工具集
const customerServiceTools = [orderTool, logisticsTool, refundTool];
const llmWithCustomerTools = llm.bindTools(customerServiceTools);

// 使用完整的工具调用流程
async function customerServiceChat(question) {
  const messages = [new HumanMessage(question)];
  const response = await llmWithCustomerTools.invoke(messages);

  if (response.tool_calls && response.tool_calls.length > 0) {
    messages.push(response);

    for (const toolCall of response.tool_calls) {
      const tool = customerServiceTools.find((t) => t.name === toolCall.name);
      if (tool) {
        const result = await tool.invoke(toolCall.args);
        messages.push(
          new ToolMessage({
            tool_call_id: toolCall.id,
            content: result,
          })
        );
      }
    }

    const finalResponse = await llmWithCustomerTools.invoke(messages);
    return finalResponse.content;
  }

  return response.content;
}

// 测试
await customerServiceChat("我的订单 12345 什么时候能到？");
```

### 案例 2: 数据分析助手

**需求**: 分析销售数据，生成报告。

```javascript
import { HumanMessage, ToolMessage } from "@langchain/core/messages";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

// 工具 1: 查询销售数据
const salesDataTool = new DynamicStructuredTool({
  name: "get_sales_data",
  description: "获取指定时间范围的销售数据",
  schema: z.object({
    start_date: z.string().describe("开始日期 YYYY-MM-DD"),
    end_date: z.string().describe("结束日期 YYYY-MM-DD"),
  }),
  func: async ({ start_date, end_date }) => {
    // 查询数据库
    return JSON.stringify([
      { date: "2025-12-01", sales: 15000, orders: 50 },
      { date: "2025-12-02", sales: 18000, orders: 60 },
    ]);
  },
});

// 工具 2: 计算统计指标
const statisticsTool = new DynamicStructuredTool({
  name: "calculate_statistics",
  description: "计算平均值、总和、增长率等统计指标",
  schema: z.object({
    data: z.string().describe("JSON 格式的数据数组"),
    metric: z.enum(["average", "sum", "growth_rate"]),
  }),
  func: async ({ data, metric }) => {
    const dataArray = JSON.parse(data);
    // 计算逻辑
    return "统计结果...";
  },
});

// 创建数据分析工具集
const analyticsTools = [salesDataTool, statisticsTool];
const llmWithAnalyticsTools = llm.bindTools(analyticsTools);

// 使用工具进行数据分析
async function analyzeData(question) {
  const messages = [new HumanMessage(question)];
  const response = await llmWithAnalyticsTools.invoke(messages);

  if (response.tool_calls && response.tool_calls.length > 0) {
    messages.push(response);

    for (const toolCall of response.tool_calls) {
      const tool = analyticsTools.find((t) => t.name === toolCall.name);
      if (tool) {
        const result = await tool.invoke(toolCall.args);
        messages.push(
          new ToolMessage({
            tool_call_id: toolCall.id,
            content: result,
          })
        );
      }
    }

    const finalResponse = await llmWithAnalyticsTools.invoke(messages);
    return finalResponse.content;
  }

  return response.content;
}

// 使用示例
await analyzeData("帮我分析一下 12 月份的销售情况，计算平均销售额和增长率");
```

---

## 最佳实践

### ✅ 1. 编写清晰的工具描述

**❌ 不好的描述**

```javascript
description: "查询天气";
```

**✅ 好的描述**

```javascript
description: "获取指定城市的天气信息。当用户询问天气、温度、是否下雨时使用此工具。";
```

**为什么？**

- 明确的描述帮助 AI 准确判断何时使用工具
- 包含使用场景示例

### ✅ 2. 为参数添加详细的 describe

**❌ 不好的参数定义**

```javascript
schema: z.object({
  city: z.string(),
  date: z.string(),
});
```

**✅ 好的参数定义**

```javascript
schema: z.object({
  city: z.string().describe("城市名称，例如：北京、上海、深圳"),
  date: z
    .string()
    .optional()
    .describe("日期，格式: YYYY-MM-DD。如果不提供则查询今天的天气"),
});
```

### ✅ 3. 统一返回格式

**推荐返回 JSON 字符串：**

```javascript
func: async ({ city }) => {
  const data = await fetchWeather(city);

  // ✅ 返回结构化的 JSON
  return JSON.stringify({
    city: city,
    temperature: data.temp,
    condition: data.condition,
    timestamp: new Date().toISOString(),
  });

  // ❌ 不要返回随意格式的字符串
  // return `${city}的天气是${data.condition}，温度${data.temp}度`;
};
```

### ✅ 4. 错误处理

```javascript
func: async ({ expression }) => {
  try {
    const result = calculate(expression);
    return JSON.stringify({ success: true, result: result });
  } catch (error) {
    // 返回友好的错误信息
    return JSON.stringify({
      success: false,
      error: "计算失败",
      message: error.message,
    });
  }
};
```

### ✅ 5. 使用低温度

```javascript
// 工具调用时建议使用 temperature = 0
const llm = new ChatDeepSeek({
  model: "deepseek-chat",
  temperature: 0, // 确保工具选择的确定性
});
```

### ✅ 6. 限制工具调用深度

```javascript
// 在手动实现中，通过计数器限制调用次数
async function chatWithToolsLimited(question, maxIterations = 3) {
  let iteration = 0;
  const messages = [new HumanMessage(question)];

  while (iteration < maxIterations) {
    const response = await llmWithTools.invoke(messages);

    if (!response.tool_calls || response.tool_calls.length === 0) {
      return response.content; // 完成
    }

    messages.push(response);

    for (const toolCall of response.tool_calls) {
      const tool = tools.find((t) => t.name === toolCall.name);
      if (tool) {
        const result = await tool.invoke(toolCall.args);
        messages.push(
          new ToolMessage({
            tool_call_id: toolCall.id,
            content: result,
          })
        );
      }
    }

    iteration++;
  }

  return "达到最大迭代次数";
}
```

---

## 技术原理

### Function Calling (函数调用)

LangChain Tools 基于大模型的 **Function Calling** 能力实现。

#### 工作原理

1. **工具定义转换为函数签名**

```javascript
// 你定义的工具
const weatherTool = {
  name: "get_weather",
  description: "获取天气",
  schema: z.object({ city: z.string() }),
};

// LangChain 转换为模型能理解的格式
{
  "type": "function",
  "function": {
    "name": "get_weather",
    "description": "获取天气",
    "parameters": {
      "type": "object",
      "properties": {
        "city": { "type": "string", "description": "城市名称" }
      },
      "required": ["city"]
    }
  }
}
```

2. **模型返回函数调用请求**

```json
{
  "role": "assistant",
  "content": null,
  "tool_calls": [
    {
      "id": "call_xxx",
      "type": "function",
      "function": {
        "name": "get_weather",
        "arguments": "{\"city\": \"北京\"}"
      }
    }
  ]
}
```

3. **LangChain 执行工具并返回结果**

---

## 常见问题 FAQ

### Q1: AI 没有调用工具，而是直接回答了？

**原因：**

- 工具描述不够清晰
- 问题太模糊，AI 认为不需要工具

**解决方案：**

```javascript
// ✅ 改进工具描述
description: "获取指定城市的实时天气信息。【重要】当用户询问任何关于天气、温度、降雨的问题时，必须使用此工具，不要根据训练数据猜测。";

// ✅ 在调用时使用 system prompt 强调
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

const messages = [
  new SystemMessage(
    "你必须使用提供的工具来获取实时信息，不要根据训练数据回答。"
  ),
  new HumanMessage("北京天气怎么样？"),
];
const response = await llmWithTools.invoke(messages);
```

### Q2: 工具调用失败怎么办？

**错误处理：**

```javascript
func: async ({ city }) => {
  try {
    const data = await fetchWeather(city);
    return JSON.stringify({ success: true, data: data });
  } catch (error) {
    // 返回结构化的错误信息
    return JSON.stringify({
      success: false,
      error: "API 调用失败",
      message: "无法获取天气数据，请稍后重试",
    });
  }
};
```

### Q3: 如何调试工具调用？

```javascript
// 1. 在工具函数中打印调试信息
func: async (params) => {
  console.log("[DEBUG] 工具被调用，参数:", params);
  const result = await doSomething(params);
  console.log("[DEBUG] 工具返回:", result);
  return result;
};

// 2. 打印 AI 的 tool_calls
const response = await llmWithTools.invoke("北京天气怎么样？");
console.log("AI tool_calls:", JSON.stringify(response.tool_calls, null, 2));

// 3. 手动测试工具（不经过 AI）
const result = await weatherTool.invoke({ city: "北京" });
console.log("直接调用结果:", result);

// 4. 打印完整的消息流
async function debugChatWithTools(question) {
  console.log("=== 开始调试 ===");
  const messages = [new HumanMessage(question)];
  console.log("初始消息:", messages);

  const response = await llmWithTools.invoke(messages);
  console.log("AI 响应:", response);
  console.log("tool_calls:", response.tool_calls);
  // ... 继续调试
}
```

### Q4: 工具太多，AI 选错了怎么办？

**解决方案：**

1. **减少工具数量** - 每个 Agent 不要超过 10 个工具
2. **优化描述** - 让每个工具的功能更明确
3. **分组管理** - 为不同任务创建不同的 Agent

```javascript
// ❌ 所有工具放在一起（超过 10 个工具）
const allTools = [
  weatherTool,
  calculatorTool,
  orderTool,
  refundTool,
  logisticsTool,
  databaseTool,
  emailTool,
  searchTool,
  translateTool,
  timeTool, // ... 更多工具
];

// ✅ 按功能分组，创建不同的 LLM 实例
const customerServiceTools = [orderTool, refundTool, logisticsTool];
const llmForCustomerService = llm.bindTools(customerServiceTools);

const dataAnalysisTools = [databaseTool, calculatorTool, statisticsTool];
const llmForDataAnalysis = llm.bindTools(dataAnalysisTools);
```

### Q5: 如何实现工具的权限控制？

```javascript
const sensitiveOperationTool = new DynamicStructuredTool({
  name: "delete_user",
  description: "删除用户（仅管理员可用）",
  schema: z.object({
    user_id: z.string(),
    admin_token: z.string().describe("管理员令牌"),
  }),
  func: async ({ user_id, admin_token }) => {
    // 验证权限
    if (!verifyAdminToken(admin_token)) {
      return JSON.stringify({
        success: false,
        error: "权限不足",
      });
    }

    // 执行操作
    await deleteUser(user_id);
    return JSON.stringify({ success: true });
  },
});
```

---

## 进阶主题

### 1. 工具的组合与链式调用

```javascript
// 场景：查询天气后，根据天气推荐穿衣
const weatherTool = new DynamicStructuredTool({
  /* ... */
});
const clothingRecommendationTool = new DynamicStructuredTool({
  name: "recommend_clothing",
  description: "根据天气推荐穿衣",
  schema: z.object({
    temperature: z.number(),
    condition: z.string(),
  }),
  func: async ({ temperature, condition }) => {
    // 推荐逻辑
  },
});

// Agent 会自动：
// 1. 调用 weatherTool 获取天气
// 2. 将结果传给 clothingRecommendationTool
// 3. 生成最终建议
```

### 2. 手动实现多轮对话（保存上下文）

```javascript
// 使用数组保存对话历史
const conversationHistory = [];

async function chatWithMemory(question) {
  // 添加新的用户消息
  conversationHistory.push(new HumanMessage(question));

  // 调用 AI（包含历史上下文）
  const response = await llmWithTools.invoke(conversationHistory);

  if (response.tool_calls && response.tool_calls.length > 0) {
    conversationHistory.push(response);

    for (const toolCall of response.tool_calls) {
      const tool = tools.find((t) => t.name === toolCall.name);
      if (tool) {
        const result = await tool.invoke(toolCall.args);
        conversationHistory.push(
          new ToolMessage({
            tool_call_id: toolCall.id,
            content: result,
          })
        );
      }
    }

    const finalResponse = await llmWithTools.invoke(conversationHistory);
    conversationHistory.push(finalResponse);
    return finalResponse.content;
  }

  conversationHistory.push(response);
  return response.content;
}

// 多轮对话示例
await chatWithMemory("查询订单 12345");
await chatWithMemory("这个订单什么时候发货的？"); // AI 会记得之前的订单号
```

### 3. 实现流式工具调用

```javascript
// 注意：工具调用本身通常不支持流式
// 但可以在工具结果返回后，流式输出最终回答

async function streamFinalAnswer(question) {
  const messages = [new HumanMessage(question)];
  const response = await llmWithTools.invoke(messages);

  if (response.tool_calls && response.tool_calls.length > 0) {
    messages.push(response);

    for (const toolCall of response.tool_calls) {
      const tool = tools.find((t) => t.name === toolCall.name);
      if (tool) {
        const result = await tool.invoke(toolCall.args);
        messages.push(
          new ToolMessage({
            tool_call_id: toolCall.id,
            content: result,
          })
        );
      }
    }

    // 流式输出最终回答
    const stream = await llmWithTools.stream(messages);
    for await (const chunk of stream) {
      process.stdout.write(chunk.content || "");
    }
  }
}
```

---

## 学习路径建议

### 📁 本文配套实战文件

按顺序完成以下练习，逐步掌握 Tools 的使用：

| 文件名                | 内容                  | 预计用时 |
| --------------------- | --------------------- | -------- |
| `test-setup.js`       | 环境验证              | 5 分钟   |
| `01-create-tool.js`   | 创建自定义工具        | 15 分钟  |
| `02-bind-tools.js`    | AI 自动选择工具       | 20 分钟  |
| `03-tool-loop.js`     | 完整工具调用循环      | 30 分钟  |
| `04-tavily-search.js` | TavilySearch 真实搜索 | 20 分钟  |

### 🎯 学习路线

**第 1 阶段：基础入门（1 小时）**

1. ✅ 完成环境搭建，运行 `test-setup.js`
2. ✅ 完成 `01-create-tool.js`，理解工具四要素
3. ✅ 完成 `02-bind-tools.js`，观察 AI 如何选择工具

**第 2 阶段：核心掌握（1-2 小时）**

1. 🔥 完成 `03-tool-loop.js`，理解 ToolMessage 的作用
2. 🔥 尝试修改工具的 `description`，观察 AI 行为变化
3. 🔥 创建自己的工具（如：随机数、单位转换）

**第 3 阶段：进阶应用（2+ 小时）**

1. 💎 注册 Tavily 账号，完成 `04-tavily-search.js`
2. 💎 创建多工具应用（如：智能助手）
3. 💎 学习 LangGraph 构建复杂 Agent

---

## 实战挑战

### 🥉 挑战 1：创建实用工具集

在掌握基础后，尝试创建以下工具：

```javascript
// 创建 05-my-tools.js，实现以下工具：

// 1. 随机数生成器
const randomTool = new DynamicStructuredTool({
  name: "random",
  description: "生成随机数",
  schema: z.object({
    min: z.number().describe("最小值"),
    max: z.number().describe("最大值"),
  }),
  func: async ({ min, max }) => {
    return String(Math.floor(Math.random() * (max - min + 1)) + min);
  },
});

// 2. 单位转换工具（温度）
const tempConverterTool = new DynamicStructuredTool({
  name: "convert_temp",
  description: "摄氏度和华氏度转换",
  schema: z.object({
    value: z.number(),
    from: z.enum(["C", "F"]),
  }),
  func: async ({ value, from }) => {
    if (from === "C") {
      return `${value}°C = ${((value * 9) / 5 + 32).toFixed(1)}°F`;
    }
    return `${value}°F = ${(((value - 32) * 5) / 9).toFixed(1)}°C`;
  },
});

// 3. 字符串处理工具
const stringTool = new DynamicStructuredTool({
  name: "string_process",
  description: "字符串处理：大小写转换、反转、Base64编码",
  schema: z.object({
    text: z.string(),
    operation: z.enum(["upper", "lower", "reverse", "base64"]),
  }),
  func: async ({ text, operation }) => {
    switch (operation) {
      case "upper":
        return text.toUpperCase();
      case "lower":
        return text.toLowerCase();
      case "reverse":
        return text.split("").reverse().join("");
      case "base64":
        return Buffer.from(text).toString("base64");
    }
  },
});
```

### 🥈 挑战 2：智能助手应用

创建一个结合多个工具的智能助手：

```javascript
// 创建 06-smart-assistant.js
// 结合天气、时间、计算器、搜索等工具
// 实现一个可以回答各种问题的助手
```

### 🥇 挑战 3：带记忆的对话系统

参考"进阶主题"章节，实现多轮对话记忆功能。

### 💡 挑战完成检验

完成挑战后，尝试回答以下问题：

1. 工具的 `description` 对 AI 的工具选择有什么影响？
2. 为什么工具函数的返回值建议使用字符串？
3. `ToolMessage` 的 `tool_call_id` 为什么是必须的？
4. 如何让 AI 在不需要工具时直接回答？

---

## 参考资源

### 官方文档

- **LangChain Tools 官方文档**: https://js.langchain.com/docs/concepts/tools/
- **LangChain 内置工具列表**: https://js.langchain.com/docs/integrations/tools
- **LangGraph（Agent 框架）**: https://langchain-ai.github.io/langgraphjs/
- **Zod Schema 验证**: https://zod.dev/

### API 服务

- **Tavily Search API**: https://tavily.com/ （专为 AI 设计的搜索引擎）
- **DeepSeek API**: https://platform.deepseek.com/ （高性价比 LLM）
- **OpenAI Function Calling**: https://platform.openai.com/docs/guides/function-calling

### 开发工具

- **Trae AI IDE**: https://www.trae.ai/ （推荐的 AI 开发环境）

---

## 总结

### 🎯 核心要点

1. **Tools 让 AI 拥有能力** - 查询数据、执行计算、调用 API
2. **四要素** - name、description、schema、func
3. **ToolMessage** - 将工具结果传回 AI 的关键
4. **内置工具** - TavilySearch 等 LangChain 官方工具开箱即用
5. **最佳实践** - 清晰描述、错误处理、统一格式

### 💡 记住这句话

> **Tools 不是让 AI 更聪明，而是让 AI 能做更多事情。**

### 📁 本文实战文件清单

完成本教程后，你的项目结构应该是：

```
langchain-tools-demo/
├── .env                    # 环境变量配置
├── package.json            # 项目配置
├── test-setup.js           # 环境验证
├── 01-create-tool.js       # 实战练习 1：创建工具
├── 02-bind-tools.js        # 实战练习 2：绑定工具
├── 03-tool-loop.js         # 实战练习 3：完整调用循环
├── 04-tavily-search.js     # 实战练习 4：TavilySearch
├── 05-my-tools.js          # 挑战 1：自定义工具集
└── 06-smart-assistant.js   # 挑战 2：智能助手
```

### 🔑 关键收获

学完本文后，你应该能够：

- ✅ 使用 Trae 搭建 LangChain 开发环境
- ✅ 理解 Tools 的工作原理和使用场景
- ✅ 创建自定义工具并绑定到 LLM
- ✅ 实现完整的工具调用循环（包括 ToolMessage）
- ✅ 使用 TavilySearch 实现真实的互联网搜索
- ✅ 调试工具调用问题并进行优化

---

## 作者寄语

感谢你阅读这份文档！LangChain Tools 是 AI 应用开发中最实用的功能之一，希望这份详解能帮助你快速上手。

**动手实践是最好的学习方式！** 不要只是阅读，请按照文中的实战练习一步步操作，你会发现 Tools 其实很简单。

如果你在学习过程中遇到问题，可以：

- 💬 在 Trae 中询问 AI 助手，它能直接阅读你的代码帮你排查问题
- 📖 查阅 [LangChain 官方文档](https://js.langchain.com/docs/concepts/tools/)
- 🔍 使用 TavilySearch 搜索最新的解决方案

如果你觉得这份文档对你有帮助，欢迎：

- ⭐ 点赞收藏，方便以后查阅
- 📢 分享给更多正在学习 AI 开发的朋友
- 💬 在评论区交流你的学习心得和实践成果

**Happy Coding!** 🚀
