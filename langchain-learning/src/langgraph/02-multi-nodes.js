/**
 * LangGraph 入门 Demo 2: 多节点串行流程
 *
 * 🎯 学习目标：
 * - 理解多个节点如何串联
 * - 理解状态如何在节点间传递
 * - 理解每个节点只更新部分状态
 *
 * 📝 场景：数据处理流水线
 *    输入文本 → 转大写 → 添加前缀 → 添加后缀 → 输出
 */

import { StateGraph, Annotation, END, START } from "@langchain/langgraph";

console.log("🚀 LangGraph Demo 2: 多节点串行流程\n");
console.log("=".repeat(50));

// ============================================
// 第一步：定义状态
// ============================================

const PipelineState = Annotation.Root({
  // 原始输入
  original: Annotation({
    reducer: (_, next) => next,
    default: () => "",
  }),
  // 处理中的文本（每个节点都会修改它）
  text: Annotation({
    reducer: (_, next) => next,
    default: () => "",
  }),
  // 记录处理步骤
  steps: Annotation({
    reducer: (prev, next) => [...prev, ...next], // 累加模式！
    default: () => [],
  }),
});

console.log("\n📋 状态结构:");
console.log("   - original: 原始输入（不变）");
console.log("   - text: 当前文本（每步都变）");
console.log("   - steps: 处理记录（累加）\n");

// ============================================
// 第二步：定义多个节点
// ============================================

// 节点 1：转大写
function toUpperCaseNode(state) {
  console.log(`   [toUpperCase] 输入: "${state.text}"`);
  const result = state.text.toUpperCase();
  console.log(`   [toUpperCase] 输出: "${result}"`);
  return {
    text: result,
    steps: ["转大写"],  // 这会累加到 steps 数组
  };
}

// 节点 2：添加前缀
function addPrefixNode(state) {
  console.log(`   [addPrefix] 输入: "${state.text}"`);
  const result = "【重要】" + state.text;
  console.log(`   [addPrefix] 输出: "${result}"`);
  return {
    text: result,
    steps: ["添加前缀"],
  };
}

// 节点 3：添加后缀
function addSuffixNode(state) {
  console.log(`   [addSuffix] 输入: "${state.text}"`);
  const result = state.text + "！！！";
  console.log(`   [addSuffix] 输出: "${result}"`);
  return {
    text: result,
    steps: ["添加后缀"],
  };
}

console.log("🔧 节点定义:");
console.log("   - toUpperCase: 文本转大写");
console.log("   - addPrefix: 添加前缀");
console.log("   - addSuffix: 添加后缀\n");

// ============================================
// 第三步：构建状态图
// ============================================

/**
 * 串行流程：按顺序连接多个节点
 *
 * START → toUpperCase → addPrefix → addSuffix → END
 */
const graph = new StateGraph(PipelineState)
  .addNode("toUpperCase", toUpperCaseNode)
  .addNode("addPrefix", addPrefixNode)
  .addNode("addSuffix", addSuffixNode)
  // 定义执行顺序
  .addEdge(START, "toUpperCase")
  .addEdge("toUpperCase", "addPrefix")
  .addEdge("addPrefix", "addSuffix")
  .addEdge("addSuffix", END);

console.log("🔗 流程图:");
console.log("   START → toUpperCase → addPrefix → addSuffix → END\n");

// ============================================
// 第四步：编译并运行
// ============================================

const app = graph.compile();

console.log("▶️  开始执行...\n");
console.log("-".repeat(50));

const result = await app.invoke({
  original: "hello world",
  text: "hello world",  // 初始文本
});

console.log("-".repeat(50));

console.log("\n✅ 执行完成！");
console.log("\n📊 最终状态:");
console.log(`   original: "${result.original}" (保持不变)`);
console.log(`   text: "${result.text}" (最终结果)`);
console.log(`   steps: [${result.steps.join(" → ")}] (处理记录)`);

// ============================================
// 重点：理解 Reducer
// ============================================

console.log("\n" + "=".repeat(50));
console.log("💡 重点理解 - Reducer 的作用:\n");
console.log("   text 字段使用 (_, next) => next");
console.log("   → 每次返回的值直接替换旧值\n");
console.log("   steps 字段使用 (prev, next) => [...prev, ...next]");
console.log("   → 每次返回的值会累加到数组中\n");
console.log("   这就是为什么 steps 能记录所有步骤！");
console.log("=".repeat(50));

// ============================================
// 动手练习
// ============================================

console.log("\n🎯 动手练习:");
console.log("   1. 添加一个新节点：反转字符串");
console.log("   2. 调整节点的执行顺序");
console.log("   3. 添加一个 'processingTime' 状态记录耗时");

