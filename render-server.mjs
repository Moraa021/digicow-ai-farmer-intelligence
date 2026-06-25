import { createServer } from "http";
import { createRequire } from "module";
import { readFileSync, existsSync } from "fs";
import { join, extname } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const require = createRequire(import.meta.url);

let handler;
try {
  handler = require("./dist/server/server.js");
  handler = handler.default || handler;
} catch (e) {
  console.error("Failed to load server.js:", e);
  process.exit(1);
}

const MIME = {
  ".js": "application/javascript",
  ".css": "text/css",
  ".html": "text/html",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};

const port = process.env.PORT || 3000;

const server = createServer(async (req, res) => {
  try {
    // Serve static assets from dist/client
    const staticPath = join(__dirname, "dist/client", req.url.split("?")[0]);
    if (existsSync(staticPath) && !staticPath.endsWith("/")) {
      const ext = extname(staticPath);
      res.writeHead(200, {
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000",
      });
      res.end(readFileSync(staticPath));
      return;
    }

    // SSR everything else
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
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (e) {
    console.error("Request error:", e);
    res.writeHead(500);
    res.end("Internal Server Error");
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});