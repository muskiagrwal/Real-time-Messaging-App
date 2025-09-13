import React, { useState, useEffect } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  IconButton,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Badge,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Logout as LogoutIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import ChatRoom from './ChatRoom';
import axios from 'axios';

const drawerWidth = 300;

const Chat = () => {
  const { user, logout } = useAuth();
  const { socket, joinRoom, leaveRoom, connected } = useSocket();
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: '', description: '' });
  const [users, setUsers] = useState([]);
  const [directMessageUser, setDirectMessageUser] = useState('');
  const [availableRooms, setAvailableRooms] = useState([]);
  const [showJoinRooms, setShowJoinRooms] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    console.log('Chat component mounted, fetching rooms and users...');
    fetchRooms();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (socket) {
      console.log('Socket connected, setting up listeners...');
      socket.on('receive_message', (data) => {
        // Handle incoming messages
        console.log('Received message:', data);
      });

      return () => {
        console.log('Cleaning up socket listeners...');
        socket.off('receive_message');
      };
    } else {
      console.log('Socket not available yet...');
    }
  }, [socket]);

  const fetchRooms = async () => {
    try {
      console.log('Fetching rooms...');
      const response = await axios.get('/api/rooms');
      console.log('Rooms response:', response.data);
      setRooms(response.data);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchAvailableRooms = async () => {
    try {
      console.log('Fetching available rooms to join...');
      const response = await axios.get('/api/rooms/available');
      console.log('Available rooms response:', response.data);
      setAvailableRooms(response.data);
    } catch (error) {
      console.error('Error fetching available rooms:', error);
    }
  };

  const handleCreateRoom = async () => {
    try {
      const response = await axios.post('/api/rooms', newRoom);
      setRooms([...rooms, response.data.room]);
      setCreateRoomOpen(false);
      setNewRoom({ name: '', description: '' });
    } catch (error) {
      console.error('Error creating room:', error);
    }
  };

  const handleJoinRoom = async (roomId) => {
    try {
      await axios.post(`/api/rooms/${roomId}/join`);
      fetchRooms();
    } catch (error) {
      console.error('Error joining room:', error);
    }
  };

  const handleSelectRoom = (room) => {
    console.log('Selecting room:', room);
    console.log('Current selected room:', selectedRoom);
    
    if (selectedRoom) {
      console.log('Leaving previous room:', selectedRoom._id);
      leaveRoom(selectedRoom._id);
    }
    
    console.log('Setting new selected room:', room);
    setSelectedRoom(room);
    console.log('Joining room:', room._id);
    joinRoom(room._id);
  };

  const handleDirectMessage = async () => {
    try {
      const response = await axios.post('/api/rooms/direct', {
        userId: directMessageUser
      });
      const room = response.data.room;
      setRooms([...rooms, room]);
      setDirectMessageUser('');
    } catch (error) {
      console.error('Error creating direct message:', error);
    }
  };

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap component="div">
            Chat Rooms
          </Typography>
        </Toolbar>
        
        <Box sx={{ overflow: 'auto', p: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Rooms: {rooms.length} | Selected: {selectedRoom ? selectedRoom.name : 'None'}
          </Typography>
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateRoomOpen(true)}
            fullWidth
            sx={{ mb: 2 }}
          >
            Create Room
          </Button>
          
          <Button
            variant="outlined"
            onClick={async () => {
              try {
                console.log('Creating test room...');
                const response = await axios.post('/api/test-room');
                console.log('Test room response:', response.data);
                fetchRooms(); // Refresh rooms list
              } catch (error) {
                console.error('Error creating test room:', error);
              }
            }}
            fullWidth
            sx={{ mb: 2 }}
          >
            Create Test Room
          </Button>

          <Button
            variant="outlined"
            color="secondary"
            onClick={() => {
              setShowJoinRooms(!showJoinRooms);
              if (!showJoinRooms) {
                fetchAvailableRooms();
              }
            }}
            fullWidth
            sx={{ mb: 2 }}
          >
            {showJoinRooms ? 'Hide Available Rooms' : 'Join Rooms'}
          </Button>

          {/* Available Rooms to Join */}
          {showJoinRooms && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                Available Rooms
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="Search rooms..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ mb: 1 }}
              />
              <List sx={{ maxHeight: 200, overflow: 'auto' }}>
                {availableRooms
                  .filter(room => 
                    room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    room.description?.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((room) => (
                    <ListItem key={room._id} disablePadding>
                      <ListItemButton
                        onClick={async () => {
                          try {
                            await handleJoinRoom(room._id);
                            setShowJoinRooms(false);
                            setSearchTerm('');
                          } catch (error) {
                            console.error('Error joining room:', error);
                          }
                        }}
                      >
                        <ListItemText
                          primary={room.name}
                          secondary={`Created by ${room.createdBy?.username} • ${room.members?.length || 0} members`}
                        />
                        <Chip
                          label="Join"
                          size="small"
                          color="secondary"
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                {availableRooms.length === 0 && (
                  <ListItem>
                    <ListItemText 
                      primary="No rooms available to join" 
                      secondary="All public rooms are already joined"
                    />
                  </ListItem>
                )}
              </List>
            </Box>
          )}

          {/* My Rooms */}
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
            My Rooms
          </Typography>
          <List>
            {rooms.length === 0 ? (
              <ListItem>
                <ListItemText 
                  primary="No rooms available" 
                  secondary="Create a room or join existing ones"
                />
              </ListItem>
            ) : (
              rooms.map((room) => {
                console.log('Rendering room:', room);
                return (
                  <ListItem key={room._id} disablePadding>
                    <ListItemButton
                      selected={selectedRoom?._id === room._id}
                      onClick={() => handleSelectRoom(room)}
                    >
                      <ListItemText
                        primary={room.name}
                        secondary={room.type === 'direct' ? 'Direct Message' : room.description}
                      />
                      <Chip
                        label={room.members?.length || 0}
                        size="small"
                        color="primary"
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })
            )}
          </List>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          p: 3,
        }}
      >
        <AppBar position="static" color="default" elevation={1}>
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              {selectedRoom ? selectedRoom.name : 'Select a room'}
            </Typography>
            <Chip 
              label={connected ? 'Connected' : 'Disconnected'} 
              color={connected ? 'success' : 'error'}
              size="small"
              sx={{ mr: 2 }}
            />
            <IconButton color="inherit">
              <Badge color="secondary" variant="dot">
                <PersonIcon />
              </Badge>
            </IconButton>
            <IconButton color="inherit" onClick={logout}>
              <LogoutIcon />
            </IconButton>
          </Toolbar>
        </AppBar>

        {selectedRoom ? (
          <ChatRoom room={selectedRoom} />
        ) : (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 'calc(100vh - 200px)',
            }}
          >
            <Typography variant="h5" color="text.secondary">
              Select a room to start chatting
            </Typography>
          </Box>
        )}
      </Box>

      {/* Create Room Dialog */}
      <Dialog open={createRoomOpen} onClose={() => setCreateRoomOpen(false)}>
        <DialogTitle>Create New Room</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Room Name"
            fullWidth
            variant="outlined"
            value={newRoom.name}
            onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={newRoom.description}
            onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateRoomOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateRoom} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Chat;
