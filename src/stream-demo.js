import OpenAI from 'openai';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 初始化 OpenAI 客户端，配置为使用 DeepSeek API
const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com/v1'
});

/**
 * 流式聊天函数
 * @param {string} message - 用户输入的消息
 * @param {string} model - 使用的模型，默认为 deepseek-chat
 */
async function streamChat(message, model = 'deepseek-chat') {
  try {
    console.log('🤖 DeepSeek AI 正在思考...\n');
    console.log(`👤 用户: ${message}\n`);
    console.log('🤖 AI: ');

    // 创建流式聊天完成
    const stream = await client.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content: '你是一个有用的AI助手，请用中文回答问题。'
        },
        {
          role: 'user',
          content: message
        }
      ],
      stream: true,
      max_tokens: 1000,
      temperature: 0.7
    });

    let fullResponse = '';

    // 处理流式响应
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        process.stdout.write(content);
        fullResponse += content;
      }
    }

    console.log('\n\n' + '='.repeat(50) + '\n');
    return fullResponse;

  } catch (error) {
    console.error('❌ 错误:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
    throw error;
  }
}

/**
 * 交互式聊天模式
 */
async function interactiveChat() {
  console.log('🚀 DeepSeek API 流式输出演示');
  console.log('📝 输入 "exit" 或 "quit" 退出程序\n');

  // 导入 readline 模块用于交互式输入
  const readline = await import('readline');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const askQuestion = () => {
    rl.question('请输入您的问题: ', async (input) => {
      const trimmedInput = input.trim();
      
      if (trimmedInput.toLowerCase() === 'exit' || trimmedInput.toLowerCase() === 'quit') {
        console.log('👋 再见！');
        rl.close();
        return;
      }

      if (trimmedInput === '') {
        console.log('⚠️  请输入有效的问题\n');
        askQuestion();
        return;
      }

      try {
        await streamChat(trimmedInput);
        askQuestion();
      } catch (error) {
        console.log('发生错误，请重试\n');
        askQuestion();
      }
    });
  };

  askQuestion();
}

/**
 * 演示不同类型的问题
 */
async function runDemo() {
  console.log('🎯 运行预设演示...\n');

  const demoQuestions = [
    '请介绍一下 Node.js 的特点',
    '什么是流式输出？它有什么优势？',
    '请写一个简单的 JavaScript 函数来计算斐波那契数列'
  ];

  for (let i = 0; i < demoQuestions.length; i++) {
    console.log(`\n📋 演示 ${i + 1}/${demoQuestions.length}:`);
    await streamChat(demoQuestions[i]);
    
    // 在演示之间添加延迟
    if (i < demoQuestions.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

/**
 * 主函数
 */
async function main() {
  // 检查 API 密钥
  if (!process.env.DEEPSEEK_API_KEY) {
    console.error('❌ 错误: 请在 .env 文件中设置 DEEPSEEK_API_KEY');
    process.exit(1);
  }

  // 获取命令行参数
  const args = process.argv.slice(2);
  const mode = args[0] || 'interactive';

  switch (mode) {
    case 'demo':
      await runDemo();
      break;
    case 'interactive':
    default:
      await interactiveChat();
      break;
  }
}

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的 Promise 拒绝:', reason);
  process.exit(1);
});

// 运行主函数
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { streamChat, interactiveChat, runDemo };