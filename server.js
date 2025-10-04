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

// Middleware - More permissive CORS for debugging
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Database connection test
app.get('/test-db', async (req, res) => {
  const envCheck = {
    JWT_SECRET: !!process.env.JWT_SECRET,
    DB_HOST: !!process.env.DB_HOST,
    DB_USER: !!process.env.DB_USER,
    DB_DATABASE: !!process.env.DB_DATABASE,
    DB_PASSWORD: !!process.env.DB_PASSWORD,
    DB_PORT: !!process.env.DB_PORT,
    DATABASE_URL: !!process.env.DATABASE_URL
  };
  
  // Show which config is being used
  const usingDatabaseUrl = !!process.env.DATABASE_URL;
  const dbConfig = usingDatabaseUrl ? 
    { connectionString: process.env.DATABASE_URL } :
    {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      database: process.env.DB_DATABASE,
      port: process.env.DB_PORT
    };
  
  try {
    const db = require('./config/db');
    const result = await db.query('SELECT NOW()');
    res.json({ 
      status: 'Database connected', 
      time: result.rows[0].now,
      env_vars: envCheck,
      using_database_url: usingDatabaseUrl,
      config: dbConfig
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'Database connection failed', 
      error: error.message || 'Unknown error',
      stack: error.stack,
      env_vars: envCheck,
      using_database_url: usingDatabaseUrl,
      config: dbConfig
    });
  }
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