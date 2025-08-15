import React, { useState, useEffect } from 'react';
import {
    Paper,
    Typography,
    TextField,
    Button,
    Box,
    Alert,
    CircularProgress,
    Link,
    Fade,
    Zoom,
    Container,
    Grid,
    useTheme
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { registerPeer, getPeers, checkServers } from '../services/api';
import websocketService from '../services/websocket';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

const AnimatedPaper = styled(Paper)(({ theme }) => ({
    padding: theme.spacing(4),
    maxWidth: 500,
    margin: 'auto',
    marginTop: theme.spacing(2),
    textAlign: 'center',
    background: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
    transition: 'all 0.3s ease-in-out',
    '&:hover': {
        transform: 'translateY(-5px)',
        boxShadow: '0 12px 40px 0 rgba(31, 38, 135, 0.45)',
    },
}));

const StatusIcon = styled(Box)(({ theme, status }) => ({
    width: 60,
    height: 60,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto',
    marginBottom: theme.spacing(2),
    background: status === 'online' 
        ? 'linear-gradient(45deg, #4CAF50 30%, #45a049 90%)'
        : status === 'offline'
        ? 'linear-gradient(45deg, #f44336 30%, #d32f2f 90%)'
        : 'linear-gradient(45deg, #2196F3 30%, #1976D2 90%)',
    color: 'white',
    boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
}));

const PeerRegistration = ({ onPeerRegistered }) => {
    const [ip, setIp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [serverStatus, setServerStatus] = useState('checking');
    const theme = useTheme();

    useEffect(() => {
        checkServerStatus();
    }, []);

    const checkServerStatus = async () => {
        try {
            console.log('Checking server status...');
            await checkServers();
            console.log('Server status check successful');
            setServerStatus('online');
            setError('');
        } catch (error) {
            console.error('Server status check failed:', error);
            setServerStatus('offline');
            setError(error.message);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
            if (!ipRegex.test(ip)) {
                throw new Error('Invalid IP address format');
            }

            if (serverStatus !== 'online') {
                await checkServerStatus();
                if (serverStatus !== 'online') {
                    throw new Error('Server connection failed. Please check both servers are running.');
                }
            }

            const peer = await registerPeer(ip);
            websocketService.connect(peer.id.toString());
            onPeerRegistered(peer);
        } catch (err) {
            console.error('Registration error:', err);
            setError(err.message || 'Failed to register peer. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="sm" sx={{ pt: 2 }}>
            <Fade in timeout={1000}>
                <AnimatedPaper elevation={3}>
                    <Zoom in timeout={500}>
                        <StatusIcon status={serverStatus}>
                            {serverStatus === 'online' ? <CheckCircleOutlineIcon sx={{ fontSize: 40 }} /> :
                             serverStatus === 'offline' ? <ErrorOutlineIcon sx={{ fontSize: 40 }} /> :
                             <NetworkCheckIcon sx={{ fontSize: 40 }} />}
                        </StatusIcon>
                    </Zoom>

                    <Typography variant="h4" gutterBottom sx={{ 
                        fontWeight: 'bold',
                        background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        mb: 2
                    }}>
                        Register as a Peer
                    </Typography>

                    <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                        Join the distributed network by registering your IP address
                    </Typography>

                    {serverStatus === 'checking' && (
                        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                            <CircularProgress size={20} />
                            <Typography>Checking network status...</Typography>
                        </Box>
                    )}

                    {serverStatus === 'offline' && (
                        <Alert 
                            severity="error" 
                            sx={{ mb: 3 }}
                            action={
                                <Button color="inherit" size="small" onClick={checkServerStatus}>
                                    Retry
                                </Button>
                            }
                        >
                            {error}
                            <Box sx={{ mt: 1 }}>
                                <Link href="/" target="_blank" sx={{ mr: 1 }}>
                                    Check API Server
                                </Link>
                                <Link href="/" target="_blank">
                                    Check File Server
                                </Link>
                            </Box>
                        </Alert>
                    )}

                    <Box component="form" onSubmit={handleSubmit}>
                        <TextField
                            fullWidth
                            label="IP Address"
                            variant="outlined"
                            value={ip}
                            onChange={(e) => setIp(e.target.value)}
                            placeholder="e.g., 192.168.1.100"
                            required
                            disabled={loading || serverStatus !== 'online'}
                            sx={{ 
                                mb: 3,
                                '& .MuiOutlinedInput-root': {
                                    '&:hover fieldset': {
                                        borderColor: theme.palette.primary.main,
                                    },
                                },
                            }}
                        />

                        {error && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {error}
                            </Alert>
                        )}

                        <Button
                            type="submit"
                            variant="contained"
                            size="large"
                            fullWidth
                            disabled={loading || serverStatus !== 'online'}
                            sx={{ 
                                mt: 2,
                                background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                                boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
                                '&:hover': {
                                    background: 'linear-gradient(45deg, #1976D2 30%, #21CBF3 90%)',
                                },
                            }}
                        >
                            {loading ? (
                                <CircularProgress size={24} color="inherit" />
                            ) : (
                                'Join Network'
                            )}
                        </Button>
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
                        Note: The system will automatically assign you a unique peer ID and port
                    </Typography>
                </AnimatedPaper>
            </Fade>
        </Container>
    );
};

export default PeerRegistration; 