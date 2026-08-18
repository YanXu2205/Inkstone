/**
 * Throwaway OpenAI-compatible endpoint for manual end-to-end checks of the
 * AI copilot: streams a canned reply so no real provider or key is needed.
 *
 *   node scripts/mock-ai-server.mjs
 *   # then point Settings → AI at http://localhost:8787/v1
 */
import { createServer } from "node:http";

const PORT = 8787;

const REPLY = `# Hello from the mock model

This paragraph was rewritten by the mock endpoint, so the diff has something
to show. The next line is unchanged.

- item one
- item two`;

createServer((req, res) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
  if (req.method === "OPTIONS") {
    res.writeHead(204, cors).end();
    return;
  }

  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    console.log(`${req.method} ${req.url} — ${body.length} bytes in`);
    res.writeHead(200, {
      ...cors,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    });
    const chunks = REPLY.match(/[\s\S]{1,24}/g) ?? [];
    let i = 0;
    const tick = setInterval(() => {
      if (i >= chunks.length) {
        clearInterval(tick);
        res.write("data: [DONE]\n\n");
        res.end();
        return;
      }
      const payload = { choices: [{ delta: { content: chunks[i++] } }] };
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    }, 40);
  });
}).listen(PORT, () => console.log(`mock AI endpoint on http://localhost:${PORT}/v1`));
