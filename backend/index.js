import "dotenv/config";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import app from "./app.js";
import { initSocket } from "./socket/socketHandler.js";
import { resolveAllowedOrigins } from "./utils/corsOrigins.js";

if (!process.env.JWT_SECRET) {
  console.error("[startup] Missing JWT_SECRET — add it in Render → Environment.");
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
  console.error("[startup] Missing MONGODB_URI — add your MongoDB Atlas URI in Render → Environment.");
  process.exit(1);
}

const port = Number(process.env.PORT) || 5000;

function socketCors() {
  const list = resolveAllowedOrigins(process.env.CLIENT_URL);
  if (list == null) {
    return { origin: true, credentials: true };
  }
  return { origin: list, credentials: true };
}

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    ...socketCors(),
    methods: ["GET", "POST"],
  },
});

app.set("io", io);
initSocket(io);

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    server.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    console.error(
      "[startup] Fix: Atlas → Network Access allow 0.0.0.0/0 (or Render egress), correct user/password, URL-encode special chars in password."
    );
    process.exit(1);
  });
