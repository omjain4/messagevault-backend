const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:8080", "https://retro-message-vault.vercel.app"], // Your React app's URLs
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:8080", "https://retro-message-vault.vercel.app"],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Serve static files (for video uploads)
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/profiles', require('./routes/profiles'));
app.use('/api/videos', require('./routes/videos'));

// Socket.IO Logic
const userSockets = {}; // { userId: socketId }

io.on('connection', (socket) => {
  console.log('a user connected:', socket.id);
  
  // Store user's socket ID upon connection
  socket.on('registerUser', (userId) => {
    userSockets[userId] = socket.id;
    console.log('User registered:', userId, 'with socket:', socket.id);
  });

  socket.on('disconnect', () => {
    console.log('user disconnected:', socket.id);
    for (const userId in userSockets) {
      if (userSockets[userId] === socket.id) {
        delete userSockets[userId];
        break;
      }
    }
  });
});

// Make io and userSockets accessible in request handlers
app.set('socketio', io);
app.set('userSockets', userSockets);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));