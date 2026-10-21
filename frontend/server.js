const http = require('http');
const fs = require('fs');
const path = require('path');

const mimeTypes = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const PORT = parseInt(process.env.PORT || '3000', 10);

const server = http.createServer((req, res) => {
  // Clean URL to prevent directory traversal
  let safeUrl = req.url.split('?')[0];
  let filePath = path.join(__dirname, safeUrl === '/' ? 'index.html' : safeUrl);

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        const ext = path.extname(safeUrl).toLowerCase();
        // If requesting a static asset with file extension, do not fallback to index.html
        if (ext && ext !== '.html') {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
          res.end(`404 Not Found: ${safeUrl}`);
          return;
        }

        // Fallback to index.html for client-side routing
        fs.readFile(path.join(__dirname, 'index.html'), (fallbackErr, fallbackContent) => {
          if (fallbackErr) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
            res.end('File not found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
            res.end(fallbackContent);
          }
        });
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=UTF-8' });
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      res.writeHead(200, { 
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      res.end(content);
    }
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[WARNING] Port ${PORT} sedang digunakan oleh proses lain!`);
  } else {
    console.error('Server error:', err);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n============================================================`);
  console.log(`  MAINTENANCE APPS - PT MENARA TERUS MAKMUR (ASTRA OTOPARTS)`);
  console.log(`  Frontend Dashboard aktif pada: http://localhost:${PORT}`);
  console.log(`============================================================\n`);
});
