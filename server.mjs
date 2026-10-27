import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { WebSocketServer } from "ws";
const production = process.env.NODE_ENV === "production";
let handler;
if (!production) {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { middlewareMode: true, allowedHosts: true, hmr: false },
    appType: "spa",
  });
  handler = (req, res) => vite.middlewares(req, res);
} else {
  const root = resolve("dist");
  const mime = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".json": "application/json",
    ".wav": "audio/wav",
  };
  handler = async (req, res) => {
    if (req.url === "/healthz") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      return res.end("ok");
    }
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405);
      return res.end();
    }
    try {
      const path = decodeURIComponent(
        new URL(req.url, "http://local").pathname,
      );
      const file = resolve(root, "." + (path === "/" ? "/index.html" : path));
      if (!file.startsWith(root + "/")) {
        res.writeHead(403);
        return res.end();
      }
      const data = await readFile(file);
      res.writeHead(200, {
        "Content-Type": mime[extname(file)] || "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control":
          path.startsWith("/assets/") &&
          /-[A-Za-z0-9_-]{8,}\.(js|css)$/.test(path)
            ? "public, max-age=31536000, immutable"
            : "no-cache",
      });
      res.end(req.method === "HEAD" ? undefined : data);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  };
}
const server = createServer(handler);
const wss = new WebSocketServer({ noServer: true, maxPayload: 50000 });
server.on("upgrade", (req, socket, head) => {
  if (req.url === "/party")
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws));
});
const rooms = new Map();
let next = 1;
const send = (s, m) => {
  if (s.readyState === 1) s.send(JSON.stringify(m));
};
wss.on("connection", (ws) => {
  ws.id = String(next++);
  ws.on("message", (raw) => {
    try {
      if (raw.length > 50000) return;
      const m = JSON.parse(raw);
      if (m.type === "join") {
        if (ws.room) return;
        const code = m.code
          ? String(m.code).toUpperCase()
          : Math.random().toString(36).slice(2, 8).toUpperCase();
        let room = rooms.get(code);
        if (m.code && !room)
          return send(ws, { type: "error", message: "Комната не найдена" });
        if (!room) {
          room = {
            host: ws.id,
            clients: new Set(),
            claimed: new Set(
              (Array.isArray(m.collected) ? m.collected : []).filter(
                (k) => typeof k === "string" && k.length < 100,
              ),
            ),
          };
          rooms.set(code, room);
        }
        if (room.clients.size >= 4)
          return send(ws, {
            type: "error",
            message: "В комнате уже четыре игрока",
          });
        room.clients.add(ws);
        ws.room = code;
        send(ws, {
          type: "joined",
          code,
          id: ws.id,
          host: room.host,
          claimed: [...room.claimed],
        });
        for (const c of room.clients)
          send(c, { type: "party", count: room.clients.size });
      } else if (ws.room) {
        const room = rooms.get(ws.room);
        if (!room) return;
        if (
          ["world", "zone", "progress", "reward", "ending"].includes(m.type) &&
          room.host !== ws.id
        )
          return;
        if (m.type === "claim") {
          if (
            typeof m.key !== "string" ||
            m.key.length > 100 ||
            !["herb", "ore", "chest", "wood", "shard"].includes(m.kind)
          )
            return;
          if (room.claimed.has(m.key))
            return send(ws, {
              type: "error",
              message: "Этот предмет уже забрал другой игрок",
            });
          room.claimed.add(m.key);
          for (const c of room.clients)
            send(c, { type: "loot", key: m.key, owner: ws.id, kind: m.kind });
          return;
        }
        if (
          ![
            "world",
            "zone",
            "progress",
            "reward",
            "ending",
            "position",
            "hit",
            "revive",
          ].includes(m.type)
        )
          return;
        for (const c of room.clients)
          if (c !== ws) send(c, { ...m, id: ws.id });
      }
    } catch {}
  });
  ws.on("close", () => {
    const r = rooms.get(ws.room);
    if (!r) return;
    r.clients.delete(ws);
    if (r.host === ws.id) {
      for (const c of r.clients) {
        send(c, { type: "closed" });
        c.close();
      }
      rooms.delete(ws.room);
    } else
      for (const c of r.clients)
        send(c, { type: "left", id: ws.id, count: r.clients.size });
  });
});
const port = Number(process.env.PORT) || 5173;
server.listen(port, "0.0.0.0", () =>
  console.log(`Forest Ash: port ${port}, production=${production}`),
);
