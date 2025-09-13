import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Alert } from '@mui/material';
import { useSocket } from '../contexts/SocketContext';
import axios from 'axios';

const ConnectionTest = () => {
  const { socket, connected } = useSocket();
  const [apiTest, setApiTest] = useState(null);
  const [socketTest, setSocketTest] = useState(null);

  useEffect(() => {
    // Test API connection
    const testAPI = async () => {
      try {
        const response = await axios.get('/api/test');
        setApiTest({ success: true, data: response.data });
      } catch (error) {
        setApiTest({ success: false, error: error.message });
      }
    };

    testAPI();

    // Test Socket connection
    if (socket) {
      socket.emit('test', 'Hello from client');
      socket.on('test_response', (data) => {
        setSocketTest({ success: true, data });
      });
    }

    return () => {
      if (socket) {
        socket.off('test_response');
      }
    };
  }, [socket]);

  const testSocketConnection = () => {
    if (socket) {
      socket.emit('test', 'Manual test');
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Connection Test
      </Typography>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1">API Connection:</Typography>
        {apiTest ? (
          <Alert severity={apiTest.success ? 'success' : 'error'}>
            {apiTest.success ? 
              `✅ API Working: ${JSON.stringify(apiTest.data)}` : 
              `❌ API Error: ${apiTest.error}`
            }
          </Alert>
        ) : (
          <Typography>Testing...</Typography>
        )}
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1">Socket Connection:</Typography>
        <Alert severity={connected ? 'success' : 'error'}>
          {connected ? '✅ Socket Connected' : '❌ Socket Disconnected'}
        </Alert>
        {socketTest && (
          <Alert severity="success" sx={{ mt: 1 }}>
            Socket Response: {JSON.stringify(socketTest.data)}
          </Alert>
        )}
      </Box>

      <Button 
        variant="contained" 
        onClick={testSocketConnection}
        disabled={!socket}
      >
        Test Socket Connection
      </Button>
    </Box>
  );
};

export default ConnectionTest;
