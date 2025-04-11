import React, { useState, useEffect } from 'react';
import { getPeers } from '../services/api';

const PeerList = () => {
    const [peers, setPeers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchPeers = async () => {
        try {
            const peersList = await getPeers();
            setPeers(peersList);
        } catch (err) {
            setError('Failed to fetch peers');
            console.error('Error fetching peers:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPeers();
        const interval = setInterval(fetchPeers, 5000); // Refresh every 5 seconds
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div>Loading peers...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="peer-list">
            <h2>Registered Peers</h2>
            <table>
                <thead>
                    <tr>
                        <th>Peer ID</th>
                        <th>IP Address</th>
                        <th>Port</th>
                    </tr>
                </thead>
                <tbody>
                    {peers.map(peer => (
                        <tr key={peer.id}>
                            <td>{peer.id}</td>
                            <td>{peer.ip}</td>
                            <td>{peer.port}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default PeerList; 