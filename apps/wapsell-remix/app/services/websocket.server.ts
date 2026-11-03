import type { Server as HttpServer } from 'node:http';
import { Server as SocketIOServer, Socket } from 'socket.io';

let io: SocketIOServer | null = null;

export function initWebSocket(server: HttpServer) {
  if (!io) {
    io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
      },
    });

    io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      const empresaId = socket.handshake.auth.empresaId;
      if (!token || !empresaId) return next(new Error('Authentication required'));
      socket.data.token = token;
      socket.data.empresaId = empresaId;
      socket.data.userId = socket.handshake.auth.userId;
      next();
    });

    io.on('connection', (socket: Socket) => {
      const empresaId = socket.data.empresaId;
      socket.join(`empresa-${empresaId}`);
      console.log(`[WebSocket] User ${socket.data.userId} connected to empresa ${empresaId}`);
      socket.on('order:create', (data) => io?.to(`empresa-${empresaId}`).emit('order:created', data));
      socket.on('inventory:update', (data) => io?.to(`empresa-${empresaId}`).emit('inventory:updated', data));
      socket.on('disconnect', () => console.log(`[WebSocket] User ${socket.data.userId} disconnected`));
    });
  }
  return io;
}

export function getIO() {
  return io;
}

export function broadcastToEmpresa(empresaId: string, event: string, data: unknown) {
  io?.to(`empresa-${empresaId}`).emit(event, data);
}

export function broadcastToUser(userId: string, event: string, data: unknown) {
  io?.to(`user-${userId}`).emit(event, data);
}
