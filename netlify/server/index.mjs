import createHttpServer from "../../server/createHttpServer.js";

// Netlify owns the listener and routes HTTP requests and WebSocket upgrades to
// this exported server. Do not call listen() in this entry point.
const server = await createHttpServer();

export default server;
