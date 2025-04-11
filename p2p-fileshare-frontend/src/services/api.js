const API_BASE_URL = 'http://localhost:8080';
const FILE_SERVER_URL = 'http://localhost:9000';

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
            throw new Error('API server is not responding on port 8080');
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
    return `${FILE_SERVER_URL}/files/${peerId}/${filename}`;
}; 