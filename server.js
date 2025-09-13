const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
require('dotenv').config({ path: './config.env' });

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "https://real-time-messaging-app-72u5.vercel.app/"],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// Middleware
app.use(cors({
  origin: [
    "http://localhost:3000", 
    "https://real-time-messaging-app-72u5.vercel.app/"
  ],
  credentials: true
}))
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/realtime-chat', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running!', timestamp: new Date() });
});

// Create a test room for debugging
app.post('/api/test-room', async (req, res) => {
  try {
    const Room = require('./models/Room');
    const User = require('./models/User');
    
    // Get the first user or create one
    let user = await User.findOne();
    if (!user) {
      user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });
      await user.save();
    }
    
    // Create a test room
    const room = new Room({
      name: 'Test Room',
      description: 'A test room for debugging',
      type: 'public',
      createdBy: user._id,
      members: [{
        user: user._id,
        role: 'admin'
      }]
    });
    
    await room.save();
    await room.populate('createdBy', 'username avatar');
    await room.populate('members.user', 'username avatar isOnline');
    
    res.json({ message: 'Test room created', room });
  } catch (error) {
    console.error('Error creating test room:', error);
    res.status(500).json({ message: 'Error creating test room' });
  }
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/users', require('./routes/users'));

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Test event
  socket.on('test', (data) => {
    console.log('Test received:', data);
    socket.emit('test_response', { message: 'Hello from server!', received: data, timestamp: new Date() });
  });

  // Join room
  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  // Leave room
  socket.on('leave_room', (roomId) => {
    socket.leave(roomId);
    console.log(`User ${socket.id} left room ${roomId}`);
  });

  // Send message
  socket.on('send_message', (data) => {
    socket.to(data.roomId).emit('receive_message', data);
  });

  // Typing indicators
  socket.on('typing', (data) => {
    socket.to(data.roomId).emit('user_typing', {
      userId: data.userId,
      username: data.username,
      isTyping: data.isTyping
    });
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { io };
