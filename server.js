const http = require("http");
const { app } = require("./app");
const { initIo } = require("./socket");
const secretVariables = require("./config/secretVariables");

const server = http.createServer(app);

// ✅ attach socket
initIo(server);

const PORT = secretVariables.port;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});