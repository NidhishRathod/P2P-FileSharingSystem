import React, { useState, useEffect, useContext } from 'react';
import {
  Box,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Description as FileIcon,
  ArrowBack as BackIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { getPeers, getFiles, downloadFile, getPeerFiles } from '../services/api';
import { FileRefreshContext } from './FileSources';

const steps = ['Select destination peer', 'Select source peer', 'Select file to download'];

const FileDownload = () => {
  const fileRefreshContext = useContext(FileRefreshContext);
  
  const [activeStep, setActiveStep] = useState(0);
  const [peers, setPeers] = useState([]);
  const [destinationPeer, setDestinationPeer] = useState('');
  const [sourcePeer, setSourcePeer] = useState('');
  const [availableFiles, setAvailableFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadPeers();
  }, []);

  const loadPeers = async () => {
    try {
      setLoading(true);
      console.log('Loading peers...');
      const peersData = await getPeers();
      console.log('Peers loaded:', peersData);
      setPeers(peersData);
      setError('');
    } catch (err) {
      setError(`Failed to load peers: ${err.message}`);
      console.error('Error loading peers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = () => {
    if (activeStep === 0 && !destinationPeer) {
      setError('Please select a destination peer first');
      return;
    }
    
    if (activeStep === 1 && !sourcePeer) {
      setError('Please select a source peer first');
      return;
    }
    
    if (activeStep === 0) {
      // Going from step 0 to 1, load source peers (all peers except destination)
      setActiveStep(1);
      setSourcePeer('');
      setSelectedFile(null);
    } else if (activeStep === 1) {
      // Going from step 1 to 2, load files from the selected source peer
      loadFilesFromPeer(sourcePeer);
      setActiveStep(2);
    }
  };

  const handleBackStep = () => {
    if (activeStep === 1) {
      setActiveStep(0);
      setSourcePeer('');
    } else if (activeStep === 2) {
      setActiveStep(1);
      setSelectedFile(null);
    }
  };

  const loadFilesFromPeer = async (peerId) => {
    try {
      setLoading(true);
      console.log(`Loading files from peer ${peerId}...`);
      
      // Use the new API to get files for a specific peer
      const filesForPeer = await getPeerFiles(peerId);
      console.log(`Files for peer ${peerId}:`, filesForPeer);
      setAvailableFiles(filesForPeer);
      setError('');
    } catch (err) {
      setError(`Failed to load files: ${err.message}`);
      console.error('Error loading files:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (file) => {
    try {
      if (!destinationPeer || !sourcePeer || !file) {
        setError('Missing required information for download');
        return;
      }
      
      setLoading(true);
      setError('');
      setSuccess('');
      setSelectedFile(file);
      
      console.log(`Downloading ${file.filename} from peer ${sourcePeer} to peer ${destinationPeer}...`);
      await downloadFile(destinationPeer, sourcePeer, file.filename);
      
      setSuccess(`Successfully downloaded ${file.filename}`);
      
      if (fileRefreshContext && fileRefreshContext.refresh) {
        fileRefreshContext.refresh();
      }
    } catch (err) {
      setError(`Download failed: ${err.message}`);
      console.error('Error downloading file:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setActiveStep(0);
    setDestinationPeer('');
    setSourcePeer('');
    setSelectedFile(null);
    setAvailableFiles([]);
    setError('');
    setSuccess('');
  };

  if (loading && peers.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          Download Files
        </Typography>
        <Button 
          startIcon={<RefreshIcon />} 
          onClick={loadPeers}
          size="small"
        >
          Refresh Peers
        </Button>
      </Box>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

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

      <Box sx={{ mt: 2, mb: 3 }}>
        {activeStep === 0 && (
          <FormControl fullWidth>
            <InputLabel>Select destination peer (download TO)</InputLabel>
            <Select
              value={destinationPeer}
              onChange={(e) => setDestinationPeer(e.target.value)}
              label="Select destination peer (download TO)"
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
          <FormControl fullWidth>
            <InputLabel>Select source peer (download FROM)</InputLabel>
            <Select
              value={sourcePeer}
              onChange={(e) => setSourcePeer(e.target.value)}
              label="Select source peer (download FROM)"
            >
              {peers
                .filter(peer => peer.id !== destinationPeer)
                .map((peer) => (
                  <MenuItem key={peer.id} value={peer.id}>
                    Peer {peer.id} ({peer.ip})
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        )}

        {activeStep === 2 && (
          <>
            {loading ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
              </Box>
            ) : (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Files available from Peer {sourcePeer}:
                </Typography>
                
                {availableFiles.length > 0 ? (
                  <List sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
                    {availableFiles.map((file) => (
                      <React.Fragment key={file.hash}>
                        <ListItem 
                          button 
                          onClick={() => handleDownload(file)}
                          disabled={loading}
                        >
                          <ListItemIcon>
                            <FileIcon />
                          </ListItemIcon>
                          <ListItemText 
                            primary={file.filename} 
                            secondary={`${(file.filesize / 1024).toFixed(2)} KB | ${file.hash.substring(0, 16)}...`} 
                          />
                        </ListItem>
                        <Divider />
                      </React.Fragment>
                    ))}
                  </List>
                ) : (
                  <Alert severity="info">
                    No files available from this peer
                  </Alert>
                )}
              </Box>
            )}
          </>
        )}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
        <Button
          variant="outlined"
          onClick={handleBackStep}
          startIcon={<BackIcon />}
          disabled={activeStep === 0 || loading}
        >
          Back
        </Button>
        
        {activeStep < 2 && (
          <Button
            variant="contained"
            onClick={handleNextStep}
            disabled={loading || (activeStep === 0 && !destinationPeer) || (activeStep === 1 && !sourcePeer)}
          >
            Next
          </Button>
        )}
        
        {success && (
          <Button
            variant="outlined"
            onClick={handleReset}
            color="success"
          >
            Download Another File
          </Button>
        )}
      </Box>
    </Paper>
  );
};

export default FileDownload; 