import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress
} from '@mui/material';
import { CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import { uploadFile, getPeers } from '../services/api';

const FileUpload = ({ onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [peerId, setPeerId] = useState('');
  const [peers, setPeers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  React.useEffect(() => {
    const fetchPeers = async () => {
      try {
        const peersData = await getPeers();
        setPeers(peersData);
      } catch (err) {
        console.error('Error fetching peers:', err);
      }
    };
    fetchPeers();
  }, []);

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
    setError('');
    setSuccess('');
  };

  const handlePeerChange = (event) => {
    setPeerId(event.target.value);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!file || !peerId) {
      setError('Please select both a file and a peer');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('peer_id', peerId);

      await uploadFile(formData);
      setSuccess('File uploaded successfully!');
      setFile(null);
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (err) {
      setError(err.message || 'Failed to upload file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <CloudUploadIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
        <Typography variant="h5" component="h2">
          Upload File
        </Typography>
      </Box>

      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Select Peer</InputLabel>
          <Select
            value={peerId}
            onChange={handlePeerChange}
            label="Select Peer"
          >
            {peers.map((peer) => (
              <MenuItem key={peer.id} value={peer.id}>
                Peer {peer.id} ({peer.ip})
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant="contained"
          component="label"
          fullWidth
          sx={{ mb: 2 }}
        >
          Select File
          <input
            type="file"
            hidden
            onChange={handleFileChange}
          />
        </Button>

        {file && (
          <Typography variant="body2" sx={{ mb: 2 }}>
            Selected file: {file.name}
          </Typography>
        )}

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

        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          disabled={loading || !file || !peerId}
        >
          {loading ? <CircularProgress size={24} /> : 'Upload File'}
        </Button>
      </Box>
    </Paper>
  );
};

export default FileUpload; 