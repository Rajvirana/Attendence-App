import "dotenv/config";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import app from "./app.js";
import { initSocket } from "./socket/socketHandler.js";

if (!process.env.JWT_SECRET) {
  console.error("Missing JWT_SECRET");
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
  console.error("Missing MONGODB_URI");
  process.exit(1);
}

const port = Number(process.env.PORT) || 5000;

function socketCors() {
  const raw = process.env.CLIENT_URL || "";
  if (!raw.trim()) {
    return { origin: true, credentials: true };
  }
  return {
    origin: raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    credentials: true,
  };
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
    process.exit(1);
  });
