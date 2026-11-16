const createHttpServer = require("./createHttpServer");

const DEFAULT_PORT = 3000;
const requestedPort = Number.parseInt(process.env.PORT || DEFAULT_PORT, 10);
const port = Number.isInteger(requestedPort) && requestedPort > 0 && requestedPort <= 65535
  ? requestedPort
  : DEFAULT_PORT;
const frontendPort = process.env.FRONTEND_PORT || "5173";

async function startServer() {
  const httpServer = await createHttpServer();
  httpServer.on("error", error => {
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${port} is already in use. Set PORT to use another port.`);
    } else {
      console.error("Multiplayer server error:", error);
    }
    process.exitCode = 1;
  });
  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`Festive Fighter multiplayer server listening on 0.0.0.0:${port}`);
    console.log(`Allowed Vite frontend port: ${frontendPort}`);
  });
}

startServer().catch(error => {
  console.error("Could not start the multiplayer server:", error);
  process.exitCode = 1;
});
