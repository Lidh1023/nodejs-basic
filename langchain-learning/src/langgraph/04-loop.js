/**
 * LangGraph 入门 Demo 4: 循环流程
 *
 * 🎯 学习目标：
 * - 理解如何用条件边实现循环
 * - 理解循环的终止条件
 * - 理解如何防止无限循环
 *
 * 📝 场景：猜数字游戏
 *    系统随机一个数字，程序不断猜测，直到猜中
 */

import { StateGraph, Annotation, END, START } from "@langchain/langgraph";

console.log("🚀 LangGraph Demo 4: 循环流程\n");
console.log("=".repeat(50));

// ============================================
// 第一步：定义状态
// ============================================

const GuessState = Annotation.Root({
  // 目标数字
  target: Annotation({
    reducer: (_, next) => next,
    default: () => 0,
  }),
  // 当前猜测
  guess: Annotation({
    reducer: (_, next) => next,
    default: () => 0,
  }),
  // 猜测次数
  attempts: Annotation({
    reducer: (_, next) => next,
    default: () => 0,
  }),
  // 提示信息
  hint: Annotation({
    reducer: (_, next) => next,
    default: () => "",
  }),
  // 猜测历史
  history: Annotation({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
  // 是否猜中
  isCorrect: Annotation({
    reducer: (_, next) => next,
    default: () => false,
  }),
});

console.log("\n📋 状态结构:");
console.log("   - target: 目标数字");
console.log("   - guess: 当前猜测");
console.log("   - attempts: 猜测次数");
console.log("   - hint: 提示（大了/小了）");
console.log("   - history: 猜测历史");
console.log("   - isCorrect: 是否猜中\n");

// ============================================
// 第二步：定义节点
// ============================================

// 节点：生成猜测
function guessNode(state) {
  const attempts = state.attempts + 1;
  console.log(`   [guessNode] 第 ${attempts} 次猜测`);

  // 根据提示调整猜测范围
  let guess;
  if (state.hint === "") {
    // 第一次猜测，随机一个数
    guess = Math.floor(Math.random() * 100) + 1;
  } else if (state.hint === "大了") {
    // 猜小一点
    guess = Math.floor(Math.random() * state.guess) + 1;
  } else {
    // 猜大一点
    guess = Math.floor(Math.random() * (100 - state.guess)) + state.guess + 1;
  }

  console.log(`   [guessNode] 猜测: ${guess}`);

  return {
    guess,
    attempts,
    history: [`第${attempts}次: ${guess}`],
  };
}

// 节点：检查猜测
function checkNode(state) {
  console.log(`   [checkNode] 比较 ${state.guess} vs ${state.target}`);

  if (state.guess === state.target) {
    console.log(`   [checkNode] ✅ 猜中了！`);
    return { isCorrect: true, hint: "猜中了！" };
  } else if (state.guess > state.target) {
    console.log(`   [checkNode] 猜大了`);
    return { isCorrect: false, hint: "大了" };
  } else {
    console.log(`   [checkNode] 猜小了`);
    return { isCorrect: false, hint: "小了" };
  }
}

console.log("🔧 节点定义:");
console.log("   - guessNode: 生成猜测");
console.log("   - checkNode: 检查结果\n");

// ============================================
// 第三步：定义路由函数（关键！）
// ============================================

/**
 * 循环的核心：路由函数决定是继续循环还是结束
 *
 * ⚠️ 重要：一定要设置最大迭代次数，防止无限循环！
 */
const MAX_ATTEMPTS = 20;

function shouldContinue(state) {
  console.log(`   [Router] 检查是否继续...`);

  // 条件 1：猜中了 → 结束
  if (state.isCorrect) {
    console.log(`   [Router] → 猜中了，结束！`);
    return "end";
  }

  // 条件 2：达到最大次数 → 强制结束
  if (state.attempts >= MAX_ATTEMPTS) {
    console.log(`   [Router] → 达到最大次数，强制结束！`);
    return "end";
  }

  // 条件 3：继续猜
  console.log(`   [Router] → 继续猜测`);
  return "continue";
}

console.log("🔀 路由函数: shouldContinue");
console.log("   猜中 或 次数用完 → end");
console.log("   否则 → continue (回到 guess 节点)\n");

// ============================================
// 第四步：构建状态图
// ============================================

/**
 * 循环的关键：条件边指回之前的节点
 *
 * START → guess → check → [条件]
 *                           ↓ continue → guess (循环！)
 *                           ↓ end → END
 */
const graph = new StateGraph(GuessState)
  .addNode("guess", guessNode)
  .addNode("check", checkNode)
  .addEdge(START, "guess")
  .addEdge("guess", "check")
  .addConditionalEdges("check", shouldContinue, {
    continue: "guess",  // 🔄 循环回 guess 节点！
    end: END,
  });

console.log("🔗 流程图:");
console.log("                        ┌──────────────┐");
console.log("                        │   continue   │");
console.log("                        ↓              │");
console.log("   START → guess → check ─────────────┘");
console.log("                        │");
console.log("                        └── end → END\n");

// ============================================
// 第五步：编译并运行
// ============================================

const app = graph.compile();

// 随机生成目标数字
const target = Math.floor(Math.random() * 100) + 1;

console.log(`🎯 目标数字: ${target} (程序不知道)\n`);
console.log("▶️  开始猜数字游戏...\n");
console.log("-".repeat(50));

const result = await app.invoke({ target });

console.log("-".repeat(50));

console.log("\n✅ 游戏结束！");
console.log("\n📊 游戏结果:");
console.log(`   目标数字: ${result.target}`);
console.log(`   猜测次数: ${result.attempts}`);
console.log(`   是否猜中: ${result.isCorrect ? "是 ✅" : "否 ❌"}`);
console.log(`   猜测历史: ${result.history.join(" → ")}`);

// ============================================
// 重点理解
// ============================================

console.log("\n" + "=".repeat(50));
console.log("💡 重点理解 - 循环的实现:\n");
console.log("   1. 循环 = 条件边指向之前的节点");
console.log("   2. guess → check → [条件] → guess");
console.log("   3. 当条件返回 'continue' 时，流程回到 guess");
console.log("   4. 当条件返回 'end' 时，流程进入 END\n");
console.log("   ⚠️ 关键：一定要设置终止条件！");
console.log("      - 业务条件：isCorrect === true");
console.log("      - 安全条件：attempts >= MAX_ATTEMPTS");
console.log("=".repeat(50));

// ============================================
// 动手练习
// ============================================

console.log("\n🎯 动手练习:");
console.log("   1. 改进猜测算法（二分查找）");
console.log("   2. 添加一个 'giveUp' 节点，猜 5 次后自动放弃");
console.log("   3. 记录每次猜测的时间");

