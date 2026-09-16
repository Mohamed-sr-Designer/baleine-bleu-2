// Minimal static file server for local preview (no dependencies).
// Supports HTTP Range requests so the video tour can be scrubbed.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.argv[2], 10) || 4590;
const ROOT = __dirname;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff2': 'font/woff2'
};

http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  let filePath = path.join(ROOT, urlPath);
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }

  fs.stat(filePath, (err, stat) => {
    if (err || stat.isDirectory()) filePath = path.join(filePath, 'index.html');

    fs.stat(filePath, (e2, st) => {
      if (e2) { res.writeHead(404, { 'Content-Type': 'text/html' }); return res.end('<h1>404</h1>'); }
      const ext = path.extname(filePath).toLowerCase();
      const type = TYPES[ext] || 'application/octet-stream';
      const range = req.headers.range;

      if (range) {
        const m = /bytes=(\d*)-(\d*)/.exec(range);
        const start = m && m[1] ? parseInt(m[1], 10) : 0;
        const end = m && m[2] ? parseInt(m[2], 10) : st.size - 1;
        if (start >= st.size || end >= st.size) {
          res.writeHead(416, { 'Content-Range': `bytes */${st.size}` });
          return res.end();
        }
        res.writeHead(206, {
          'Content-Type': type,
          'Content-Range': `bytes ${start}-${end}/${st.size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': end - start + 1
        });
        return fs.createReadStream(filePath, { start, end }).pipe(res);
      }

      res.writeHead(200, { 'Content-Type': type, 'Content-Length': st.size, 'Accept-Ranges': 'bytes' });
      fs.createReadStream(filePath).pipe(res);
    });
  });
}).listen(PORT, () => console.log('Preview server on http://localhost:' + PORT));
