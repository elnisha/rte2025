// Minimal CORS-bypassing proxy for dev
// Forwards requests to TARGET (default http://localhost:8000)
// and adds permissive CORS headers for your frontend origin.
const http = require('http');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');

const TARGET = process.env.TARGET || 'http://localhost:8000';
const PROXY_PORT = Number(process.env.PROXY_PORT || 8001);
const ALLOW_ORIGIN = process.env.ALLOW_ORIGIN || 'http://localhost:5173';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOW_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

const server = http.createServer((req, res) => {
  // Support a local endpoint to save transcripts to disk
  try {
    const localUrl = new URL(req.url, `http://localhost:${PROXY_PORT}`);
    if (req.method === 'OPTIONS') {
      setCors(res);
      res.statusCode = 204;
      res.end();
      return;
    }
    if (req.method === 'POST' && localUrl.pathname === '/save-transcript') {
      setCors(res);
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        try {
          const body = Buffer.concat(chunks).toString('utf8');
          const j = JSON.parse(body || '{}');
          const text = String(j.text || '');
          if (!text) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: 'Missing text' }));
            return;
          }
          const dir = path.join(process.cwd(), 'data', 'transcripts');
          fs.mkdirSync(dir, { recursive: true });
          const ts = new Date().toISOString().replace(/[:.]/g, '-');
          const base = (j.filename || `transcript-${ts}.txt`).replace(/[^a-zA-Z0-9._-]/g, '_');
          const filePath = path.join(dir, base);
          fs.writeFileSync(filePath, text, 'utf8');
          // Also write/overwrite the latest pointer file
          const latestPath = path.join(dir, 'transcript.txt');
          fs.writeFileSync(latestPath, text, 'utf8');
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, path: path.relative(process.cwd(), filePath), latest: path.relative(process.cwd(), latestPath) }));
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: false, error: String(err.message || err) }));
        }
      });
      return;
    }
  } catch (_) {
    // fallthrough to proxy
  }
  // Handle preflight quickly
  if (req.method === 'OPTIONS') {
    setCors(res);
    res.statusCode = 204;
    res.end();
    return;
  }

  const targetUrl = new URL(req.url, TARGET);
  const opts = {
    protocol: targetUrl.protocol,
    hostname: targetUrl.hostname,
    port: targetUrl.port,
    method: req.method,
    path: targetUrl.pathname + targetUrl.search,
    headers: { ...req.headers, host: targetUrl.host }
  };

  const proxyReq = http.request(opts, (proxyRes) => {
    setCors(res);
    // Copy response headers except for hop-by-hop ones
    Object.entries(proxyRes.headers).forEach(([k, v]) => {
      if (!['transfer-encoding', 'content-encoding'].includes(k.toLowerCase())) {
        if (v !== undefined) res.setHeader(k, v);
      }
    });
    res.statusCode = proxyRes.statusCode || 500;
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    setCors(res);
    res.statusCode = 502;
    res.end(`Proxy error: ${err.message}`);
  });

  req.pipe(proxyReq);
});

server.listen(PROXY_PORT, () => {
  console.log(`Dev proxy listening on http://localhost:${PROXY_PORT} -> ${TARGET}`);
  console.log(`Allow-Origin: ${ALLOW_ORIGIN}`);
});
