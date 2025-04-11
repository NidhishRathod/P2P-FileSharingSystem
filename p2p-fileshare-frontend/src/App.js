import React, { useState } from 'react';
import {
  Container,
    Paper,
    Snackbar,
    Alert,
    ThemeProvider,
    createTheme,
    CssBaseline,
  Box,
  Typography,
    Grid,
    Card,
    CardContent,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button
} from '@mui/material';
import {
    PersonAdd as PersonAddIcon,
    People as PeopleIcon,
    CloudUpload as CloudUploadIcon,
    Folder as FolderIcon,
    Chat as ChatIcon,
    Storage as StorageIcon,
    Download as DownloadIcon,
    Share as ShareIcon,
    Close as CloseIcon
} from '@mui/icons-material';
import PeerRegistration from './components/PeerRegistration';
import PeerList from './components/PeerList';
import FileUpload from './components/FileUpload';
import FileList from './components/FileList';
import FileSources, { FileRefreshContext } from './components/FileSources';
import FileDownload from './components/FileDownload';
import Chat from './components/Chat';
import websocketService from './services/websocket';
import './App.css';

const theme = createTheme({
  palette: {
        mode: 'light',
    primary: {
            main: '#2196F3',
    },
    secondary: {
            main: '#21CBF3',
        },
        background: {
            default: '#f5f5f5',
            paper: '#ffffff',
        },
    },
    typography: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        h4: {
            fontWeight: 600,
        },
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    borderRadius: 8,
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                },
            },
    },
  },
});

const FeatureCard = ({ title, description, icon, color, onClick }) => (
    <Card 
        onClick={onClick}
        sx={{ 
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            transition: 'all 0.3s ease-in-out',
            cursor: 'pointer',
            '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: '0 12px 40px 0 rgba(31, 38, 135, 0.45)',
            },
        }}
    >
        <CardContent sx={{ flexGrow: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ 
                    p: 1, 
                    borderRadius: '50%', 
                    bgcolor: `${color}20`,
                    mr: 2
                }}>
                    {icon}
                </Box>
                <Typography variant="h6" component="h2">
                    {title}
                </Typography>
        </Box>
            <Typography color="text.secondary">
                {description}
            </Typography>
        </CardContent>
    </Card>
);

const App = () => {
    const [currentPeer, setCurrentPeer] = useState(null);
    const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
    const [selectedFeature, setSelectedFeature] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [fileRefreshTrigger, setFileRefreshTrigger] = useState(Date.now());

    const handlePeerRegistered = (peer) => {
        setCurrentPeer(peer);
        setNotification({
            open: true,
            message: `Successfully registered as Peer ${peer.id}`,
            severity: 'success'
        });
    };

    const handleNotificationClose = () => {
        setNotification({ ...notification, open: false });
    };

    const handleFeatureClick = (feature) => {
        if (!currentPeer && feature.id !== 'register') {
            setNotification({
                open: true,
                message: 'Please register as a peer first',
                severity: 'warning'
            });
            return;
        }
        setSelectedFeature(feature);
        setDialogOpen(true);
    };

    const handleDialogClose = () => {
        setDialogOpen(false);
        setSelectedFeature(null);
    };

    const handleFileRefresh = () => {
        setFileRefreshTrigger(Date.now());
    };

    // Create a reference object with the refresh function
    const fileRefreshContextValue = {
        refresh: handleFileRefresh
    };

    // Modify the sources and download features to wrap in the context
    const getFeatureComponent = (feature) => {
        if (feature.id === 'sources') {
            return <FileSources key={fileRefreshTrigger} />;
        } else if (feature.id === 'download') {
            return <FileDownload />;
        } else {
            return feature.component;
        }
    };

    const features = [
        {
            id: 'register',
            title: 'Register a Peer',
            description: 'Join the network by registering your IP address',
            icon: <PersonAddIcon sx={{ color: '#2196F3' }} />,
            color: '#2196F3',
            component: <PeerRegistration onPeerRegistered={handlePeerRegistered} />
        },
        {
            id: 'peers',
            title: 'View All Peers',
            description: 'See all connected peers in the network',
            icon: <PeopleIcon sx={{ color: '#4CAF50' }} />,
            color: '#4CAF50',
            component: <PeerList currentPeer={currentPeer} />
        },
        {
            id: 'upload',
            title: 'Upload Files',
            description: 'Share files with other peers in the network',
            icon: <CloudUploadIcon sx={{ color: '#FF9800' }} />,
            color: '#FF9800',
            component: <FileUpload onUploadSuccess={() => {
                setNotification({ open: true, message: 'File uploaded successfully!', severity: 'success' });
                handleFileRefresh(); // Refresh the file list after upload
            }} />
        },
        {
            id: 'files',
            title: 'Browse Files',
            description: 'View all available files in the network',
            icon: <FolderIcon sx={{ color: '#9C27B0' }} />,
            color: '#9C27B0',
            component: <FileList />
        },
        {
            id: 'sources',
            title: 'File Sources',
            description: 'Find which peers have each file',
            icon: <ShareIcon sx={{ color: '#E91E63' }} />,
            color: '#E91E63',
            component: null // Will be handled by getFeatureComponent
        },
        {
            id: 'download',
            title: 'Download Files',
            description: 'Download files from other peers',
            icon: <DownloadIcon sx={{ color: '#00BCD4' }} />,
            color: '#00BCD4',
            component: null // Will be handled by getFeatureComponent
        },
        {
            id: 'chat',
            title: 'Peer Chat',
            description: 'Communicate with other peers in real-time',
            icon: <ChatIcon sx={{ color: '#673AB7' }} />,
            color: '#673AB7',
            component: <Chat websocket={websocketService} />
        }
    ];

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
            <Box
                sx={{
                    minHeight: '100vh',
                    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                    position: 'relative',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'radial-gradient(circle at 50% 50%, rgba(33, 150, 243, 0.1) 0%, rgba(33, 150, 243, 0) 70%)',
                        pointerEvents: 'none',
                    },
                }}
            >
                <Container maxWidth="lg" sx={{ py: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
                        <Typography variant="h4" sx={{ 
                            fontWeight: 'bold',
                            background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}>
                            P2P File Sharing Network
            </Typography>
                        {currentPeer && (
                            <Box sx={{ 
                                display: 'flex', 
                                alignItems: 'center',
                                gap: 2,
                                background: 'rgba(255, 255, 255, 0.9)',
                                backdropFilter: 'blur(10px)',
                                padding: '8px 16px',
                                borderRadius: '20px',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                            }}>
                                <StorageIcon color="primary" />
                                <Typography variant="body1">
                                    Peer ID: {currentPeer.id}
              </Typography>
                            </Box>
                        )}
          </Box>

                    <Grid container spacing={3}>
                        {features.map((feature) => (
                            <Grid item key={feature.id} xs={12} sm={6} md={4}>
                                <FeatureCard 
                                    {...feature} 
                                    onClick={() => handleFeatureClick(feature)}
                                />
                            </Grid>
                        ))}
                    </Grid>
        </Container>

                <FileRefreshContext.Provider value={fileRefreshContextValue}>
                    <Dialog 
                        open={dialogOpen} 
                        onClose={handleDialogClose}
                        maxWidth="md"
                        fullWidth
                    >
                        <DialogTitle sx={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                            color: 'white'
                        }}>
                            {selectedFeature?.title}
                            <IconButton onClick={handleDialogClose} sx={{ color: 'white' }}>
                                <CloseIcon />
                            </IconButton>
                        </DialogTitle>
                        <DialogContent sx={{ mt: 2 }}>
                            {selectedFeature && getFeatureComponent(selectedFeature)}
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={handleDialogClose}>Close</Button>
                        </DialogActions>
                    </Dialog>
                </FileRefreshContext.Provider>

                <Snackbar
                    open={notification.open}
                    autoHideDuration={6000}
                    onClose={handleNotificationClose}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                >
                    <Alert onClose={handleNotificationClose} severity={notification.severity}>
                        {notification.message}
                    </Alert>
                </Snackbar>
      </Box>
    </ThemeProvider>
  );
};

export default App;
