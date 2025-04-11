import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Collapse,
  CircularProgress,
  Alert,
  Divider,
  Button
} from '@mui/material';
import {
  Folder as FolderIcon,
  ExpandLess,
  ExpandMore,
  Description as FileIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { getPeers, getFiles, getPeerFiles } from '../services/api';

// Create a context to share state between components
export const FileRefreshContext = React.createContext();

const FileSources = () => {
  const [peers, setPeers] = useState([]);
  const [peerFiles, setPeerFiles] = useState({});
  const [openPeers, setOpenPeers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  useEffect(() => {
    loadPeersAndFiles();
  }, [lastRefresh]);

  const loadPeersAndFiles = async () => {
    try {
      setLoading(true);
      // First load peers
      const peersData = await getPeers();
      setPeers(peersData);
      
      // Then load files for each peer
      const peerFilesData = {};
      for (const peer of peersData) {
        console.log(`Loading files for peer ${peer.id}...`);
        try {
          const files = await getPeerFiles(peer.id);
          peerFilesData[peer.id] = files;
          console.log(`Peer ${peer.id} files:`, files);
        } catch (err) {
          console.error(`Error loading files for peer ${peer.id}:`, err);
          peerFilesData[peer.id] = [];
        }
      }
      
      setPeerFiles(peerFilesData);
      setError('');
    } catch (err) {
      setError(`Failed to load data: ${err.message}`);
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setLastRefresh(Date.now());
  };

  const handlePeerClick = (peerId) => {
    setOpenPeers(prev => ({
      ...prev,
      [peerId]: !prev[peerId]
    }));
  };

  if (loading && peers.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <FileRefreshContext.Provider value={{ refresh: handleRefresh }}>
      <Paper sx={{ p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            Files by Peer
          </Typography>
          <Button 
            startIcon={<RefreshIcon />} 
            onClick={handleRefresh}
            size="small"
          >
            Refresh
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <List component="nav" sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
          {peers.map((peer) => {
            const files = peerFiles[peer.id] || [];
            return (
              <React.Fragment key={peer.id}>
                <ListItemButton onClick={() => handlePeerClick(peer.id)}>
                  <ListItemIcon>
                    <FolderIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={`peer_${peer.id}`} 
                    secondary={`${peer.ip} - ${files.length} files`} 
                  />
                  {openPeers[peer.id] ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
                
                <Collapse in={openPeers[peer.id]} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {files.map((file) => (
                      <ListItem key={file.hash} sx={{ pl: 4 }}>
                        <ListItemIcon>
                          <FileIcon />
                        </ListItemIcon>
                        <ListItemText 
                          primary={file.filename} 
                          secondary={`${(file.filesize / 1024).toFixed(2)} KB | ${file.hash.substring(0, 16)}...`} 
                        />
                      </ListItem>
                    ))}
                    {files.length === 0 && (
                      <ListItem sx={{ pl: 4 }}>
                        <ListItemText primary="No files available" />
                      </ListItem>
                    )}
                  </List>
                </Collapse>
                <Divider />
              </React.Fragment>
            );
          })}
        </List>

        {peers.length === 0 && (
          <Typography variant="body1" sx={{ textAlign: 'center', mt: 2 }}>
            No peers available in the network
          </Typography>
        )}
      </Paper>
    </FileRefreshContext.Provider>
  );
};

export default FileSources; 