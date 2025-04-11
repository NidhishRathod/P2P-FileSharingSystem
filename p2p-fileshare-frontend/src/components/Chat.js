import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Chip,
  OutlinedInput,
  Checkbox,
  ListItemIcon
} from '@mui/material';
import { Send as SendIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { getPeers } from '../services/api';

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const Chat = ({ websocket }) => {
  const [peers, setPeers] = useState([]);
  const [senderPeer, setSenderPeer] = useState('');
  const [receivingPeers, setReceivingPeers] = useState([]);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  const [success, setSuccess] = useState('');
  const messagesEndRef = useRef(null);

  const steps = ['Select your peer', 'Select receiving peers', 'Send messages'];

  useEffect(() => {
    loadPeers();
    if (websocket) {
      websocket.addMessageHandler(handleMessage);
    }
    return () => {
      if (websocket) {
        websocket.removeMessageHandler(handleMessage);
      }
    };
  }, [websocket]);

  // When sender peer changes, we need to reconnect the websocket
  useEffect(() => {
    if (senderPeer && websocket) {
      websocket.connect(senderPeer);
    }
  }, [senderPeer, websocket]);

  const loadPeers = async () => {
    try {
      setLoading(true);
      const peersData = await getPeers();
      setPeers(peersData);
      setError('');
    } catch (err) {
      setError('Failed to load peers');
      console.error('Error loading peers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMessage = (message) => {
    setMessages(prev => [...prev, message]);
    scrollToBottom();
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = () => {
    if (!message.trim() || !senderPeer) return;

    try {
      if (receivingPeers.includes('all')) {
        // Broadcast to all peers
        websocket.sendBroadcast(message);
        
        setMessages(prev => [...prev, {
          type: 'sent',
          from: senderPeer,
          to: 'everyone',
          content: message,
          timestamp: new Date().toISOString()
        }]);
      } else {
        // Send to selected peers
        receivingPeers.forEach(peerId => {
          websocket.sendDirectMessage(peerId, message);
          
          setMessages(prev => [...prev, {
            type: 'sent',
            from: senderPeer,
            to: `Peer ${peerId}`,
            content: message,
            timestamp: new Date().toISOString()
          }]);
        });
      }
      
      setSuccess(`Message sent to ${receivingPeers.includes('all') ? 'all peers' : `${receivingPeers.length} peers`}`);
      setTimeout(() => setSuccess(''), 3000);
      setMessage('');
      scrollToBottom();
    } catch (err) {
      setError('Failed to send message');
      console.error('Error sending message:', err);
    }
  };

  const handleNext = () => {
    if (activeStep === 0 && !senderPeer) {
      setError('Please select a peer to send from');
      return;
    }
    
    if (activeStep === 1 && receivingPeers.length === 0) {
      setError('Please select at least one peer to receive the message');
      return;
    }
    
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
    setError('');
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
    setError('');
  };

  if (loading && peers.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 2, height: '600px', display: 'flex', flexDirection: 'column' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          Chat
        </Typography>
        <Button 
          startIcon={<RefreshIcon />} 
          onClick={loadPeers}
          size="small"
        >
          Refresh Peers
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {activeStep === 0 && (
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Select your peer (send FROM)</InputLabel>
          <Select
            value={senderPeer}
            onChange={(e) => setSenderPeer(e.target.value)}
            label="Select your peer (send FROM)"
          >
            {peers.map((peer) => (
              <MenuItem key={peer.id} value={peer.id}>
                Peer {peer.id} ({peer.ip})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {activeStep === 1 && (
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Select receiving peers (send TO)</InputLabel>
          <Select
            multiple
            value={receivingPeers}
            onChange={(e) => setReceivingPeers(e.target.value)}
            input={<OutlinedInput label="Select receiving peers (send TO)" />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.includes('all') ? (
                  <Chip label="All Peers" />
                ) : (
                  selected.map((value) => (
                    <Chip key={value} label={`Peer ${value}`} />
                  ))
                )}
              </Box>
            )}
            MenuProps={MenuProps}
          >
            <MenuItem value="all">
              <ListItemIcon>
                <Checkbox checked={receivingPeers.includes('all')} />
              </ListItemIcon>
              <ListItemText primary="All Peers" />
            </MenuItem>
            {peers
              .filter(peer => peer.id !== senderPeer)
              .map((peer) => (
                <MenuItem key={peer.id} value={peer.id}>
                  <ListItemIcon>
                    <Checkbox checked={receivingPeers.includes(peer.id)} />
                  </ListItemIcon>
                  <ListItemText primary={`Peer ${peer.id} (${peer.ip})`} />
                </MenuItem>
              ))}
          </Select>
        </FormControl>
      )}

      {activeStep === 2 && (
        <>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1">
              Sending as: Peer {senderPeer}
            </Typography>
            <Typography variant="subtitle1">
              Receiving: {receivingPeers.includes('all') ? 'All Peers' : receivingPeers.map(id => `Peer ${id}`).join(', ')}
            </Typography>
          </Box>

          <Box sx={{ flexGrow: 1, overflow: 'auto', mb: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <List>
              {messages.map((msg, index) => (
                <React.Fragment key={index}>
                  <ListItem>
                    <ListItemText
                      primary={msg.content}
                      secondary={`${msg.type === 'sent' ? 'Sent to' : 'Received from'} ${
                        msg.type === 'sent' ? msg.to : `Peer ${msg.from}`
                      } at ${new Date(msg.timestamp).toLocaleTimeString()}`}
                    />
                  </ListItem>
                  <Divider component="li" />
                </React.Fragment>
              ))}
              <div ref={messagesEndRef} />
            </List>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            />
            <Button
              variant="contained"
              onClick={handleSend}
              disabled={!message.trim()}
              endIcon={<SendIcon />}
            >
              Send
            </Button>
          </Box>
        </>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2, justifyContent: 'space-between' }}>
        <Button 
          onClick={handleBack} 
          disabled={activeStep === 0}
        >
          Back
        </Button>
        <Box sx={{ flex: '1 1 auto' }} />
        {activeStep < 2 ? (
          <Button variant="contained" onClick={handleNext}>
            Next
          </Button>
        ) : null}
      </Box>
    </Paper>
  );
};

export default Chat; 