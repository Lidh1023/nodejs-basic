/**
 * LangGraph 入门 Demo 1: Hello World
 *
 * 🎯 学习目标：
 * - 理解 StateGraph 的基本结构
 * - 理解 Annotation 如何定义状态
 * - 理解 Node（节点）的作用
 * - 理解 Edge（边）如何连接节点
 *
 * 📝 这是最简单的 LangGraph 示例，不需要调用 LLM
 */

import { StateGraph, Annotation, END, START } from "@langchain/langgraph";

console.log("🚀 LangGraph Demo 1: Hello World\n");
console.log("=" .repeat(50));

// ============================================
// 第一步：定义状态 (State)
// ============================================

/**
 * 状态是 LangGraph 的核心概念
 * 它是在各个节点之间传递的数据
 *
 * Annotation.Root 用来定义状态的结构：
 * - reducer: 定义状态如何更新
 *   - (prev, next) => next 表示"直接用新值替换旧值"
 * - default: 定义默认值
 */
const SimpleState = Annotation.Root({
  // 输入字段
  input: Annotation({
    reducer: (prev, next) => next, // 新值替换旧值
    default: () => "",             // 默认空字符串
  }),
  // 输出字段
  output: Annotation({
    reducer: (prev, next) => next,
    default: () => "",
  }),
});

console.log("\n📋 状态结构定义:");
console.log("   - input: 用户输入");
console.log("   - output: 处理结果\n");

// ============================================
// 第二步：定义节点 (Node)
// ============================================

/**
 * 节点是一个函数，负责处理状态
 *
 * 规则：
 * 1. 接收当前 state 作为参数
 * 2. 返回要更新的字段（只返回需要更新的部分）
 * 3. 可以是同步或异步函数
 */
function greetNode(state) {
  console.log(`   [greetNode] 收到输入: "${state.input}"`);

  // 处理逻辑：生成问候语
  const greeting = `你好，${state.input}！欢迎学习 LangGraph！`;

  console.log(`   [greetNode] 生成输出: "${greeting}"`);

  // 返回要更新的状态字段
  return { output: greeting };
}

console.log("🔧 节点定义:");
console.log("   - greetNode: 接收名字，返回问候语\n");

// ============================================
// 第三步：构建状态图 (StateGraph)
// ============================================

/**
 * StateGraph 将节点和边组合成一个工作流
 *
 * 流程：START → greetNode → END
 *
 * - START: 特殊节点，表示流程的入口
 * - END: 特殊节点，表示流程的出口
 */
const graph = new StateGraph(SimpleState)
  .addNode("greet", greetNode)      // 添加节点
  .addEdge(START, "greet")          // START → greet
  .addEdge("greet", END);           // greet → END

console.log("🔗 流程图:");
console.log("   START → greet → END\n");

// ============================================
// 第四步：编译并运行
// ============================================

/**
 * compile() 将图编译成可执行的应用
 * invoke() 执行应用，传入初始状态
 */
const app = graph.compile();

console.log("▶️  开始执行...\n");
console.log("-".repeat(50));

// 执行图，传入初始状态
const result = await app.invoke({ input: "小明" });

console.log("-".repeat(50));
console.log("\n✅ 执行完成！");
console.log("\n📊 最终状态:");
console.log(`   input: "${result.input}"`);
console.log(`   output: "${result.output}"`);

// ============================================
// 动手练习
// ============================================

console.log("\n" + "=".repeat(50));
console.log("🎯 动手练习:");
console.log("   1. 修改 input 为你自己的名字，重新运行");
console.log("   2. 添加一个新的状态字段 'timestamp'");
console.log("   3. 在 greetNode 中添加时间戳");
console.log("=".repeat(50));

