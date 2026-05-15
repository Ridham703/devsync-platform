import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

// Import Routes
import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';
import messageRoutes from './routes/messages.js';
import teamRoutes from './routes/teams.js';
import projectRoutes from './routes/projects.js';
import userRoutes from './routes/users.js';
import notificationRoutes from './routes/notifications.js';
import analyticsRoutes from './routes/analytics.js';
import searchRoutes from './routes/search.js';
import commentRoutes from './routes/comments.js';

const app = express();
const server = http.createServer(app);

// Security & Performance Middlewares
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'https://devsync-platform.vercel.app',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      console.warn(`[SECURITY] CORS blocked for origin: ${origin}`);
      callback(null, false); // Don't throw Error, just return false
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests
app.options('*', cors());

app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());

// Rate Limiting

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', limiter);

// Serve static files from uploads directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Route Registrations
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/comments', commentRoutes);

// Fallback Health Check Route
app.get('/', (req, res) => {
  res.json({ 
    message: 'DevSync Collab Server API is running!', 
    timestamp: new Date() 
  });
});

// Connect Mongoose / Database Setup
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/devsync';
const PORT = process.env.PORT || 5000;

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => {
    console.error("MongoDB Error:", err);
  });

// 🔌 Configure Real-Time Engine via Socket.io
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    methods: ['GET', 'POST', 'PATCH'],
    credentials: true
  }
});

app.set('io', io);

io.on('connection', (socket) => {

  // 💬 CHANNEL CHAT EVENTS
  socket.on('join-user', (userId) => {
    socket.join(userId);
  });

  socket.on('join-channel', (channelId) => {
    socket.join(channelId);
  });

  socket.on('leave-channel', (channelId) => {
    socket.leave(channelId);
  });

  socket.on('new-message', (messageData) => {
    // Broadcast live message object to everyone in this specific channel/team
    const targetRoom = messageData.channel || messageData.teamId || 'general';
    
    // Use socket.to() to broadcast to everyone in the room EXCEPT the sender
    socket.to(targetRoom.toString()).emit('receive-message', messageData);
  });

  // 📋 KANBAN COLLAB EVENTS
  socket.on('join-board', (boardId) => {
    socket.join(`board:${boardId}`);
  });

  socket.on('card-moved', (moveData) => {
    // MoveData details: { taskId, sourceStatus, targetStatus, boardId }
    const targetBoard = `board:${moveData.boardId || 'default'}`;
    socket.to(targetBoard).emit('task-updated', moveData);
  });

  // ✍️ TYPING INDICATORS
  socket.on('typing', ({ user, channel }) => {
    socket.to(channel).emit('user-typing', { user });
  });

  socket.on('stop-typing', ({ user, channel }) => {
    socket.to(channel).emit('user-stop-typing', { user });
  });

  // DISCONNECTION
  socket.on('disconnect', () => {
  });
});

// Start listening on configured port
server.listen(PORT, () => {
  console.log(`🚀 DevSync Backend running on http://localhost:${PORT}`);
  console.log(`🔥 Socket server attached and listening for events...`);
});
