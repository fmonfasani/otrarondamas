const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const path = require('path');

const dev = false;
const hostname = '127.0.0.1';
const port = parseInt(process.env.PORT || '3001', 10);
const appDir = path.resolve(__dirname);

console.log('Starting server from:', appDir);
console.log('Dev mode:', dev);
console.log('Port:', port);

const app = next({
  dev,
  hostname,
  port,
  dir: appDir
});

const handle = app.getRequestHandler();

app.prepare()
  .then(() => {
    createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Error handling request:', err);
        res.statusCode = 500;
        res.end('Internal Server Error');
      }
    }).listen(port, hostname, (err) => {
      if (err) {
        console.error('Server error:', err);
        process.exit(1);
      }
      console.log(`✓ Ready on http://${hostname}:${port}`);
    });
  })
  .catch(err => {
    console.error('Failed to prepare app:', err);
    process.exit(1);
  });
