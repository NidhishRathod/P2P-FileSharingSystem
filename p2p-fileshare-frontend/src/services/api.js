// Dynamic API base URL - works in development and production
const getApiBaseUrl = () => {
  // In development, use localhost
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:8080/api';
  }
  
  // In production, use the backend URL from environment or default to Render
  // You can override this by setting window.BACKEND_URL in your HTML
  return window.BACKEND_URL ? `${window.BACKEND_URL}/api` : 'https://p2p-filesharingsystem.onrender.com/api';
};

const getFileBaseUrl = () => {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:9000/files';
  }
  
  return window.BACKEND_URL ? `${window.BACKEND_URL}/files` : 'https://p2p-filesharingsystem.onrender.com/files';
};

const API_BASE_URL = getApiBaseUrl();
const FILE_BASE_URL = getFileBaseUrl();

const handleResponse = async (response) => {
    if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to fetch');
    }
    return response;
};

export const checkServers = async () => {
    try {
        // Try to get peers list to check API server
        const apiResponse = await fetch(`${API_BASE_URL}/peers`, {
            method: 'GET',
            mode: 'cors',
            credentials: 'omit',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        });
        
        if (!apiResponse.ok) {
            throw new Error('API server is not responding');
        }
        
        return true;
    } catch (error) {
        console.error('Server check error:', error);
        throw error;
    }
};

export const registerPeer = async (ip) => {
    const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ip }),
    });
    return handleResponse(response).then(res => res.json());
};

export const getPeers = async () => {
    const response = await fetch(`${API_BASE_URL}/peers`);
    return handleResponse(response).then(res => res.json());
};

export const uploadFile = async (formData) => {
    const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
    });
    return handleResponse(response).then(res => res.text());
};

export const getFiles = async () => {
    const response = await fetch(`${API_BASE_URL}/files`);
    return handleResponse(response).then(res => res.json());
};

export const getPeerFiles = async (peerId) => {
    const response = await fetch(`${API_BASE_URL}/peer_files/${peerId}`);
    return handleResponse(response).then(res => res.json());
};

export const getFileSources = async (hash) => {
    const response = await fetch(`${API_BASE_URL}/sources/${hash}`);
    return handleResponse(response).then(res => res.json());
};

export const downloadFile = async (peerId, sourcePeerId, filename) => {
    const formData = new FormData();
    formData.append('peer_id', peerId);
    formData.append('source_peer_id', sourcePeerId);
    formData.append('filename', filename);

    const response = await fetch(`${API_BASE_URL}/download`, {
        method: 'POST',
        body: formData,
    });
    return handleResponse(response).then(res => res.text());
};

export const getFileUrl = (peerId, filename) => {
    return `${FILE_BASE_URL}/${peerId}/${filename}`;
};