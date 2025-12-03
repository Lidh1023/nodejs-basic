/**
 * LangGraph 入门 Demo 3: 条件分支
 *
 * 🎯 学习目标：
 * - 理解条件边 (Conditional Edges)
 * - 理解路由函数 (Router Function)
 * - 理解如何根据状态决定流程走向
 *
 * 📝 场景：成绩评级系统
 *    输入分数 → 判断等级 → 根据等级给出不同反馈
 */

import { StateGraph, Annotation, END, START } from "@langchain/langgraph";

console.log("🚀 LangGraph Demo 3: 条件分支\n");
console.log("=".repeat(50));

// ============================================
// 第一步：定义状态
// ============================================

const GradeState = Annotation.Root({
  score: Annotation({
    reducer: (_, next) => next,
    default: () => 0,
  }),
  grade: Annotation({
    reducer: (_, next) => next,
    default: () => "",
  }),
  feedback: Annotation({
    reducer: (_, next) => next,
    default: () => "",
  }),
});

console.log("\n📋 状态结构:");
console.log("   - score: 分数");
console.log("   - grade: 等级 (A/B/C/D)");
console.log("   - feedback: 反馈信息\n");

// ============================================
// 第二步：定义节点
// ============================================

// 节点：评定等级
function gradeNode(state) {
  console.log(`   [gradeNode] 分数: ${state.score}`);

  let grade;
  if (state.score >= 90) grade = "A";
  else if (state.score >= 80) grade = "B";
  else if (state.score >= 60) grade = "C";
  else grade = "D";

  console.log(`   [gradeNode] 等级: ${grade}`);
  return { grade };
}

// 节点：优秀反馈 (A)
function excellentNode(state) {
  console.log(`   [excellentNode] 生成优秀反馈`);
  return { feedback: "🎉 太棒了！你是学霸！继续保持！" };
}

// 节点：良好反馈 (B)
function goodNode(state) {
  console.log(`   [goodNode] 生成良好反馈`);
  return { feedback: "👍 不错！再努力一点就能拿 A！" };
}

// 节点：及格反馈 (C)
function passNode(state) {
  console.log(`   [passNode] 生成及格反馈`);
  return { feedback: "💪 及格了，但还有提升空间，加油！" };
}

// 节点：不及格反馈 (D)
function failNode(state) {
  console.log(`   [failNode] 生成不及格反馈`);
  return { feedback: "📚 需要更加努力！建议找老师辅导。" };
}

console.log("🔧 节点定义:");
console.log("   - gradeNode: 根据分数评定等级");
console.log("   - excellentNode: A 等级反馈");
console.log("   - goodNode: B 等级反馈");
console.log("   - passNode: C 等级反馈");
console.log("   - failNode: D 等级反馈\n");

// ============================================
// 第三步：定义路由函数
// ============================================

/**
 * 路由函数：根据状态决定下一步去哪个节点
 *
 * 规则：
 * 1. 接收当前 state
 * 2. 返回一个字符串（路由 key）
 * 3. 这个 key 会映射到具体的节点名
 */
function gradeRouter(state) {
  console.log(`   [Router] 根据等级 "${state.grade}" 选择路径...`);

  // 返回的值会在 addConditionalEdges 的第三个参数中映射到节点
  switch (state.grade) {
    case "A": return "excellent";
    case "B": return "good";
    case "C": return "pass";
    default: return "fail";
  }
}

console.log("🔀 路由函数: gradeRouter");
console.log("   A → excellent");
console.log("   B → good");
console.log("   C → pass");
console.log("   D → fail\n");

// ============================================
// 第四步：构建状态图
// ============================================

/**
 * addConditionalEdges 的三个参数：
 * 1. 源节点名称
 * 2. 路由函数
 * 3. 路由映射 { 路由key: 目标节点名 }
 */
const graph = new StateGraph(GradeState)
  .addNode("grade", gradeNode)
  .addNode("excellent", excellentNode)
  .addNode("good", goodNode)
  .addNode("pass", passNode)
  .addNode("fail", failNode)
  // START → grade
  .addEdge(START, "grade")
  // grade → 条件分支
  .addConditionalEdges("grade", gradeRouter, {
    excellent: "excellent",
    good: "good",
    pass: "pass",
    fail: "fail",
  })
  // 所有分支 → END
  .addEdge("excellent", END)
  .addEdge("good", END)
  .addEdge("pass", END)
  .addEdge("fail", END);

console.log("🔗 流程图:");
console.log("                    ┌── excellent ──┐");
console.log("                    │               │");
console.log("   START → grade ──┼── good ───────┼── END");
console.log("                    │               │");
console.log("                    ├── pass ───────┤");
console.log("                    │               │");
console.log("                    └── fail ───────┘\n");

// ============================================
// 第五步：编译并测试多个分数
// ============================================

const app = graph.compile();

const testScores = [95, 82, 65, 45];

for (const score of testScores) {
  console.log("▶️  测试分数:", score);
  console.log("-".repeat(50));

  const result = await app.invoke({ score });

  console.log("-".repeat(50));
  console.log(`   等级: ${result.grade}`);
  console.log(`   反馈: ${result.feedback}`);
  console.log("\n");
}

// ============================================
// 重点理解
// ============================================

console.log("=".repeat(50));
console.log("💡 重点理解 - 条件边的工作原理:\n");
console.log("   1. gradeNode 执行完后，调用 gradeRouter(state)");
console.log("   2. gradeRouter 根据 state.grade 返回路由 key");
console.log("   3. LangGraph 查找映射表，找到对应的节点");
console.log("   4. 执行对应的节点\n");
console.log("   这就实现了「根据状态动态决定流程」！");
console.log("=".repeat(50));

// ============================================
// 动手练习
// ============================================

console.log("\n🎯 动手练习:");
console.log("   1. 添加一个 S 等级（分数 >= 95）");
console.log("   2. 让 gradeRouter 支持返回 END，跳过反馈节点");
console.log("   3. 添加一个「申诉」分支，当分数在 58-60 之间时触发");

