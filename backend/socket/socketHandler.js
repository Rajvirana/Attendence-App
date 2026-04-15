import jwt from "jsonwebtoken";

export function initSocket(io) {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error("Unauthorized"));
      }
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = { id: payload.sub, role: payload.role };
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("join:session", ({ sessionId }) => {
      if (sessionId) socket.join(`session:${sessionId}`);
    });
    socket.on("join:class", ({ classId }) => {
      if (classId) socket.join(`class:${classId}`);
    });
    socket.on("leave:class", ({ classId }) => {
      if (classId) socket.leave(`class:${classId}`);
    });
  });
}
