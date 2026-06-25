import { createServer } from "http";
import { readFileSync } from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

let handler;
try {
  handler = require("./dist/server/server.js");
  handler = handler.default || handler;
} catch (e) {
  console.error("Failed to load server.js:", e);
  process.exit(1);
}

const port = process.env.PORT || 3000;

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;

    const request = new Request(url.toString(), {
      method: req.method,
      headers: Object.fromEntries(
        Object.entries(req.headers).filter(([, v]) => v != null)
      ),
      body: ["GET", "HEAD"].includes(req.method) ? undefined : body,
    });

    const response = await handler.fetch(request, {}, {});

    res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
    const buf = Buffer.from(await response.arrayBuffer());
    res.end(buf);
  } catch (e) {
    console.error("Request error:", e);
    res.writeHead(500);
    res.end("Internal Server Error");
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});

server.on("error", (e) => {
  console.error("Server error:", e);
  process.exit(1);
});