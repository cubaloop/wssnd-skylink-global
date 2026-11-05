const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_URL = process.env.RENDER_EXTERNAL_URL || `http://127.0.0.1:${PORT}`;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.sql': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  const cleanPath = req.url.split('?')[0];

  if (cleanPath === '/healthz' || cleanPath === '/api/config') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    return res.end(JSON.stringify({
      status: 'ok',
      site: 'wssnd-skylink-global',
      entities: [
        'WSSND SKYLINK CARGO GLOBAL, S.L. (Madrid, ES - NIF B05861943)',
        'WSSND Skylink General Trading FZCO (Dubai, UAE - IFZA)'
      ],
      timestamp: new Date().toISOString(),
      wakelock: 'active-24-7'
    }));
  }

  let filePath = path.join(__dirname, cleanPath === '/' ? 'index.html' : cleanPath);
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      filePath = path.join(__dirname, 'index.html');
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`[WSSND SKYLINK Global Portal] Server listening on port ${PORT}`);
});

// Rule 2.2: Mandatory 24/7 Wake-Lock every 5 minutes (300,000 ms) to /healthz
setInterval(() => {
  const target = `${PUBLIC_URL}/healthz`;
  const client = target.startsWith('https') ? https : http;
  client.get(target, (res) => {
    res.resume();
  }).on('error', () => {});
}, 5 * 60 * 1000);
