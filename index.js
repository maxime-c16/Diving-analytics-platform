const http = require('http');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  // Health check endpoint
  if (req.url === '/health' || req.url === '/ready') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }

  // Default route
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Diving Analytics Platform</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 50px auto;
              padding: 20px;
              background-color: #f5f5f5;
            }
            .container {
              background: white;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 {
              color: #0066cc;
            }
            .info {
              margin-top: 20px;
              padding: 15px;
              background-color: #e8f4f8;
              border-left: 4px solid #0066cc;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🏊 Diving Analytics Platform</h1>
            <p>Welcome to the Diving Analytics Platform by Diving Software Inc.</p>
            <div class="info">
              <strong>Status:</strong> Running<br>
              <strong>Version:</strong> 1.0.0<br>
              <strong>Node Version:</strong> ${process.version}<br>
              <strong>Platform:</strong> ${process.platform}<br>
              <strong>Port:</strong> ${PORT}
            </div>
            <h2>Available Endpoints:</h2>
            <ul>
              <li><a href="/">/</a> - This page</li>
              <li><a href="/health">/health</a> - Health check</li>
              <li><a href="/ready">/ready</a> - Readiness check</li>
            </ul>
          </div>
        </body>
      </html>
    `);
    return;
  }

  // 404 for other routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`Diving Analytics Platform running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
