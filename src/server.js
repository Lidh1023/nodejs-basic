import http from "node:http";
import OpenAI from "openai";
import dotenv from "dotenv";
import { readFile } from "node:fs/promises";

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com/v1",
});

function sendJson(res, type, content) {
  res.write(JSON.stringify({ type, content }) + "\n");
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");

  if (
    req.method === "GET" &&
    (url.pathname === "/" || url.pathname === "/chat.html")
  ) {
    readFile(new URL("./chat.html", import.meta.url))
      .then((buf) => {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(buf);
      })
      .catch(() => {
        res.statusCode = 404;
        res.end("Not Found");
      });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/chat") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", async () => {
      let message = "";
      try {
        const json = JSON.parse(body || "{}");
        message = json.message || "";
      } catch {
        message = String(body || "");
      }

      res.writeHead(200, {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      res.flushHeaders?.();

      try {
        const stream = await client.chat.completions.create({
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content: "你是一个有用的AI助手，请用中文回答问题。",
            },
            { role: "user", content: message },
          ],
          stream: true,
          max_tokens: 1000,
          temperature: 0.7,
        });

        for await (const chunk of stream) {
          const r = chunk.choices?.[0]?.delta?.reasoning_content || "";
          const c = chunk.choices?.[0]?.delta?.content || "";
          if (r) sendJson(res, "reasoning", r);
          if (c) sendJson(res, "message", c);
        }
      } catch {
      } finally {
        sendJson(res, "done", "[DONE]");
        res.end();
      }
    });
    return;
  }

  res.statusCode = 404;
  res.end("Not Found");
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
server.listen(PORT);

export default server;
