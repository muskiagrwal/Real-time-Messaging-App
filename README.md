# Real-Time Chat Application

A modern real-time chat application built with the MERN stack (MongoDB, Express.js, React, Node.js) featuring WebSocket support for instant messaging.

## Features

- 🔐 **User Authentication** - Secure login/register with JWT tokens
- 💬 **Real-time Messaging** - Instant messaging using Socket.io
- 🏠 **Chat Rooms** - Create and join public/private chat rooms
- 👥 **Direct Messages** - Private one-on-one conversations
- 📁 **File Sharing** - Upload and share images, documents, and media
- 💾 **Message Persistence** - All messages saved to MongoDB
- 🎨 **Modern UI** - Beautiful Material-UI interface
- ⚡ **Real-time Features** - Typing indicators, online status, live updates

## Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **Socket.io** - Real-time communication
- **JWT** - Authentication
- **Cloudinary** - File storage
- **Multer** - File upload handling

### Frontend
- **React** - UI library
- **Material-UI** - Component library
- **Socket.io Client** - Real-time communication
- **Axios** - HTTP client
- **React Router** - Navigation

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud)
- Cloudinary account (for file uploads)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd realtime-chat-app
   ```

2. **Install backend dependencies**
   ```bash
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd client
   npm install
   cd ..
   ```

4. **Environment Setup**
   - Copy `config.env` and update the values:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/realtime-chat
   JWT_SECRET=your_jwt_secret_key_here
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   ```

5. **Start MongoDB**
   - Make sure MongoDB is running on your system

## Running the Application

### Development Mode

#### **Backend Server Setup**
1. **Open Terminal 1** and navigate to project root:
   ```bash
   cd "C:\Users\user\OneDrive\Desktop\reqal time"
   ```

2. **Install backend dependencies:**
   ```bash
   npm install
   ```

3. **Start the backend server:**
   ```bash
   npm run dev
   ```
   ✅ **Backend will run on: http://localhost:5000**

#### **Frontend Server Setup**
1. **Open Terminal 2** and navigate to client directory:
   ```bash
   cd "C:\Users\user\OneDrive\Desktop\reqal time\client"
   ```

2. **Install frontend dependencies:**
   ```bash
   npm install
   ```

3. **Start the frontend server:**
   ```bash
   npm start
   ```
   ✅ **Frontend will run on: http://localhost:3000**

#### **Access the Application**
- **Frontend (User Interface)**: http://localhost:3000
- **Backend API**: http://localhost:5000

**Note**: Both servers must be running simultaneously for the chat app to work properly!

#### **What Each Server Does:**

**Backend Server (Port 5000):**
- 🔐 Handles user authentication and authorization
- 🗄️ Manages MongoDB database operations
- 🔌 Provides WebSocket connections for real-time communication
- 📁 Handles file uploads and media sharing
- 🏠 Manages chat rooms and message persistence
- 📡 Serves REST API endpoints

**Frontend Server (Port 3000):**
- 🎨 Serves the React chat interface
- 🔄 Connects to backend via HTTP API calls
- ⚡ Handles real-time WebSocket communication
- 🖥️ Provides the user interface and user experience
- 📱 Responsive design for all devices

### Production Mode

1. **Build the frontend**
   ```bash
   npm run build
   ```

2. **Start the production server**
   ```bash
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### Rooms
- `GET /api/rooms` - Get user's rooms
- `POST /api/rooms` - Create new room
- `GET /api/rooms/:id` - Get room details
- `POST /api/rooms/:id/join` - Join room
- `POST /api/rooms/direct` - Create direct message

### Messages
- `GET /api/messages/:roomId` - Get room messages
- `POST /api/messages` - Send message
- `PUT /api/messages/:id` - Edit message
- `DELETE /api/messages/:id` - Delete message

### File Upload
- `POST /api/upload/single` - Upload single file
- `POST /api/upload/multiple` - Upload multiple files

## Usage

1. **Register/Login** - Create an account or login
2. **Create Room** - Click "Create Room" to make a new chat room
3. **Join Room** - Click on any room to join and start chatting
4. **Direct Message** - Start private conversations with other users
5. **Send Messages** - Type and send messages in real-time
6. **File Sharing** - Upload and share files with other users

## Real-time Features

- **Instant Messaging** - Messages appear instantly for all users
- **Typing Indicators** - See when someone is typing
- **Online Status** - Know who's online
- **Live Updates** - Room list updates in real-time

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, email support@example.com or create an issue in the repository.
