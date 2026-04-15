import "dotenv/config";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import app from "./app.js";
import { initSocket } from "./socket/socketHandler.js";

if (!process.env.JWT_SECRET) {
  console.error("[startup] Missing JWT_SECRET — add it in Render → Environment.");
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
  console.error("[startup] Missing MONGODB_URI — add your MongoDB Atlas URI in Render → Environment.");
  process.exit(1);
}

const port = Number(process.env.PORT) || 5000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true,
    methods: ["GET", "POST"],
  },
});

app.set("io", io);
initSocket(io);

mongoose.connection.on("connected", () => console.log("[mongo] Connected"));
mongoose.connection.on("disconnected", () => console.log("[mongo] Disconnected — will auto-reconnect"));
mongoose.connection.on("error", (err) => console.error("[mongo] Error:", err.message));

mongoose
  .connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    minPoolSize: 2,
    retryWrites: true,
    retryReads: true,
  })
  .then(() => {
    server.listen(port, () => {
      console.log(`[startup] Server listening on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("[startup] MongoDB connection failed:", err.message);
    console.error(
      "Fix: Atlas → Network Access allow 0.0.0.0/0 (or Render IPs), correct user/password, URL-encode special chars."
    );
    process.exit(1);
  });
