const http = require('http');
const app = require('./app');
const config = require('./config');
const { initSocketServer } = require('./websocket/socketServer');

const server = http.createServer(app);
initSocketServer(server, '*');

server.listen(config.port, () => {
  console.log(`Bingo server listening on port ${config.port} [${config.env}]`);
});

process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err));
process.on('uncaughtException', (err) => console.error('Uncaught exception:', err));
