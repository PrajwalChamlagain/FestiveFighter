import express from "express";
import { Server } from "socket.io";
import createHttpServer from "../../server/createHttpServer.js";

// Netlify owns the listener and routes HTTP requests and WebSocket upgrades to
// this exported server. Do not call listen() in this entry point.
// express and socket.io are imported here (ESM) so the Netlify Server bundler
// detects and ships them as runtime dependencies.
const server = await createHttpServer({ express, Server });

export default server;
