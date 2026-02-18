import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

dotenv.config();

import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import propertyRoutes from './routes/properties';
import tenancyRoutes from './routes/tenancies';
import legalCaseRoutes from './routes/legalCases';
import complianceRoutes from './routes/compliance';
import inspectionRoutes from './routes/inspections';
import maintenanceRoutes from './routes/maintenance';
import supportTicketRoutes from './routes/supportTickets';
import documentRoutes from './routes/documents';
import expenseRoutes from './routes/expenses';
import chatRoutes from './routes/chat';
import notificationRoutes from './routes/notifications';
import constructionRoutes from './routes/construction';
import obligationRoutes from './routes/obligations';
import revenueRecordRoutes from './routes/revenueRecords';
import handoverRoutes from './routes/handovers';
import poaRoutes from './routes/poa';
import escalationRoutes from './routes/escalations';
import dashboardRoutes from './routes/dashboard';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/tenancies', tenancyRoutes);
app.use('/api/legal-cases', legalCaseRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/support-tickets', supportTicketRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/construction', constructionRoutes);
app.use('/api/obligations', obligationRoutes);
app.use('/api/revenue-records', revenueRecordRoutes);
app.use('/api/handovers', handoverRoutes);
app.use('/api/poa', poaRoutes);
app.use('/api/escalations', escalationRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.IO for real-time chat and notifications
const connectedUsers = new Map<string, string>();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('authenticate', (userId: string) => {
    connectedUsers.set(userId, socket.id);
    socket.join(`user:${userId}`);
  });

  socket.on('join_room', (roomId: string) => {
    socket.join(`chat:${roomId}`);
  });

  socket.on('leave_room', (roomId: string) => {
    socket.leave(`chat:${roomId}`);
  });

  socket.on('chat_message', (data: { roomId: string; message: any }) => {
    io.to(`chat:${data.roomId}`).emit('new_message', data.message);
  });

  socket.on('typing', (data: { roomId: string; userName: string }) => {
    socket.to(`chat:${data.roomId}`).emit('user_typing', data);
  });

  socket.on('disconnect', () => {
    for (const [userId, socketId] of connectedUsers) {
      if (socketId === socket.id) {
        connectedUsers.delete(userId);
        break;
      }
    }
  });
});

// Make io available to routes
app.set('io', io);

// Error handler
app.use(errorHandler);

const PORT = parseInt(process.env.PORT || '3001', 10);
httpServer.listen(PORT, () => {
  console.log(`Elevare server running on port ${PORT}`);
  console.log(`API: http://localhost:${PORT}/api`);
});

export { io };
