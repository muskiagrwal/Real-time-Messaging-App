import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  Button,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Alert
} from '@mui/material';
import {
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  EmojiEmotions as EmojiIcon,
  Image as ImageIcon,
  VideoFile as VideoIcon,
  InsertDriveFile as FileIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import axios from 'axios';

const ChatRoom = ({ room }) => {
  const { user } = useAuth();
  const { socket, sendMessage, sendTyping } = useSocket();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [showFileDialog, setShowFileDialog] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchMessages();
  }, [room._id]);

  useEffect(() => {
    if (socket) {
      socket.on('receive_message', (data) => {
        if (data.roomId === room._id) {
          setMessages(prev => [...prev, data]);
        }
      });

      socket.on('user_typing', (data) => {
        if (data.roomId === room._id) {
          if (data.isTyping) {
            setTypingUsers(prev => [...prev.filter(u => u.userId !== data.userId), data]);
          } else {
            setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
          }
        }
      });

      return () => {
        socket.off('receive_message');
        socket.off('user_typing');
      };
    }
  }, [socket, room._id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const response = await axios.get(`/api/messages/${room._id}`);
      setMessages(response.data.messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const messageData = {
      content: newMessage,
      roomId: room._id,
      sender: user,
      timestamp: new Date()
    };

    try {
      // Send to server
      await axios.post('/api/messages', {
        content: newMessage,
        roomId: room._id,
        messageType: 'text'
      });

      // Send via socket for real-time
      sendMessage(messageData);
      
      setNewMessage('');
      setIsTyping(false);
      
      // Clear typing indicator
      sendTyping({
        roomId: room._id,
        userId: user._id || user.id,
        username: user.username,
        isTyping: false
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      sendTyping({
        roomId: room._id,
        userId: user._id || user.id,
        username: user.username,
        isTyping: true
      });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTyping({
        roomId: room._id,
        userId: user._id || user.id,
        username: user.username,
        isTyping: false
      });
    }, 1000);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
      setAttachments(files);
      setShowFileDialog(true);
    }
  };

  const uploadFiles = async () => {
    if (attachments.length === 0) return;

    setIsUploading(true);
    setUploadError('');
    setUploadProgress(0);

    try {
      const formData = new FormData();
      attachments.forEach(file => {
        formData.append('files', file);
      });

      const response = await axios.post('/api/upload/multiple', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        },
      });

      const uploadedFiles = response.data.files;
      
      // Send message with attachments
      const messageData = {
        content: newMessage || 'Shared a file',
        roomId: room._id,
        sender: user,
        timestamp: new Date(),
        attachments: uploadedFiles,
        messageType: uploadedFiles[0]?.fileType.startsWith('image/') ? 'image' : 'file'
      };

      // Send to server
      await axios.post('/api/messages', {
        content: newMessage || 'Shared a file',
        roomId: room._id,
        messageType: uploadedFiles[0]?.fileType.startsWith('image/') ? 'image' : 'file',
        attachments: uploadedFiles
      });

      // Send via socket for real-time
      sendMessage(messageData);
      
      setNewMessage('');
      setAttachments([]);
      setShowFileDialog(false);
      setUploadProgress(0);
      
      // Clear typing indicator
      sendTyping({
        roomId: room._id,
        userId: user._id || user.id,
        username: user.username,
        isTyping: false
      });

    } catch (error) {
      console.error('File upload error:', error);
      setUploadError(error.response?.data?.message || 'File upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) return <ImageIcon />;
    if (fileType.startsWith('video/')) return <VideoIcon />;
    return <FileIcon />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box sx={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
      {/* Messages Area */}
      <Paper 
        sx={{ 
          flexGrow: 1, 
          overflow: 'auto', 
          p: 2,
          mb: 2,
          maxHeight: 'calc(100vh - 300px)'
        }}
      >
        <List>
          {messages.map((message, index) => (
            <ListItem key={index} sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Avatar sx={{ width: 32, height: 32, mr: 1 }}>
                  {message.sender?.username?.charAt(0).toUpperCase()}
                </Avatar>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                  {message.sender?.username}
                </Typography>
                <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                  {formatTime(message.createdAt)}
                </Typography>
              </Box>
              <Typography variant="body1" sx={{ ml: 5 }}>
                {message.content}
              </Typography>
              {message.attachments && message.attachments.length > 0 && (
                <Box sx={{ ml: 5, mt: 1 }}>
                  {message.attachments.map((attachment, idx) => (
                    <Box key={idx} sx={{ mb: 1 }}>
                      {attachment.fileType.startsWith('image/') ? (
                        <Box>
                          <img 
                            src={attachment.url} 
                            alt={attachment.originalName}
                            style={{ 
                              maxWidth: '300px', 
                              maxHeight: '300px', 
                              borderRadius: '8px',
                              cursor: 'pointer'
                            }}
                            onClick={() => window.open(attachment.url, '_blank')}
                          />
                        </Box>
                      ) : (
                        <Chip
                          icon={getFileIcon(attachment.fileType)}
                          label={`${attachment.originalName} (${formatFileSize(attachment.fileSize)})`}
                          size="small"
                          color="primary"
                          sx={{ mr: 1, mb: 1, cursor: 'pointer' }}
                          onClick={() => window.open(attachment.url, '_blank')}
                        />
                      )}
                    </Box>
                  ))}
                </Box>
              )}
              <Divider sx={{ width: '100%', mt: 1 }} />
            </ListItem>
          ))}
          <div ref={messagesEndRef} />
        </List>

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <Box sx={{ mt: 1, ml: 5 }}>
            <Typography variant="caption" color="text.secondary">
              {typingUsers.map(u => u.username).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Message Input */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => {
            setNewMessage(e.target.value);
            handleTyping();
          }}
          onKeyPress={handleKeyPress}
          variant="outlined"
          size="small"
        />
        <IconButton 
          color="primary"
          onClick={() => fileInputRef.current?.click()}
        >
          <AttachFileIcon />
        </IconButton>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <IconButton color="primary">
          <EmojiIcon />
        </IconButton>
        <IconButton 
          color="primary" 
          onClick={handleSendMessage}
          disabled={!newMessage.trim()}
        >
          <SendIcon />
        </IconButton>
      </Box>

      {/* File Upload Dialog */}
      <Dialog 
        open={showFileDialog} 
        onClose={() => !isUploading && setShowFileDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Upload Files</DialogTitle>
        <DialogContent>
          {uploadError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {uploadError}
            </Alert>
          )}
          
          {isUploading && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                Uploading files... {uploadProgress}%
              </Typography>
              <LinearProgress variant="determinate" value={uploadProgress} />
            </Box>
          )}

          <List>
            {attachments.map((file, index) => (
              <ListItem key={index}>
                <ListItemAvatar>
                  <Avatar>
                    {getFileIcon(file.type)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={file.name}
                  secondary={formatFileSize(file.size)}
                />
                {!isUploading && (
                  <IconButton 
                    onClick={() => removeAttachment(index)}
                    color="error"
                  >
                    <CloseIcon />
                  </IconButton>
                )}
              </ListItem>
            ))}
          </List>

          <TextField
            fullWidth
            multiline
            rows={2}
            placeholder="Add a message (optional)..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            sx={{ mt: 2 }}
            disabled={isUploading}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setShowFileDialog(false)}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button 
            onClick={uploadFiles}
            variant="contained"
            disabled={isUploading || attachments.length === 0}
          >
            {isUploading ? 'Uploading...' : 'Upload & Send'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChatRoom;
