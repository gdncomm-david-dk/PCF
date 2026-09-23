// Tiny static server for the harness: node harness/serve.js [port]
// Serves the repo root so the page can load out/controls/... after `npm run build`.
const http = require("http");
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const port = Number(process.argv[2] || 8181);
const types = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".json": "application/json" };
http.createServer((req, res) => {
    const url = decodeURIComponent((req.url || "/").split("?")[0]);
    const file = path.join(root, url === "/" ? "harness/index.html" : url);
    if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (err, buf) => {
        if (err) { res.writeHead(404); return res.end("not found"); }
        res.writeHead(200, { "content-type": types[path.extname(file)] || "application/octet-stream" });
        res.end(buf);
    });
}).listen(port, () => console.log(`harness: http://localhost:${port}/`));
