const http = require('http');
const url = require('url');

function createOAuthServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const parsedUrl = url.parse(req.url, true);
      
      if (parsedUrl.pathname === '/callback') {
        const { token, state, error } = parsedUrl.query;
        
        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('<html><body><h1>授权失败</h1><p>请关闭此窗口并重试。</p></body></html>');
          server.close();
          reject(new Error(error));
          return;
        }
        
        if (token) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<html><body><h1>授权成功！</h1><p>请关闭此窗口并返回终端。</p></body></html>');
          server.close();
          resolve({ token, state });
          return;
        }
        
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<html><body><h1>无效响应</h1></body></html>');
        server.close();
        reject(new Error('No token received'));
        return;
      }
      
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    });
    
    server.listen(0, () => {
      const port = server.address().port;
      resolve({ server, port });
    });
    
    server.on('error', reject);
  });
}

module.exports = { createOAuthServer };