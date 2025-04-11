# P2P File Sharing Application Documentation

## Overview
This is a peer-to-peer file sharing application built with Go (backend) and React (frontend). The application allows users to:
1. Register as peers
2. Upload and download files
3. Chat with other peers
4. View file sources and availability
5. Monitor system status
6. Track file transfers
7. Manage peer connections

## System Architecture

### Backend (p2p-fileshare)
The backend is written in Go and provides the following services:
- REST API for file operations
- WebSocket server for real-time communication
- SQLite database for data persistence
- File system management for uploads

### Frontend (p2p-fileshare-frontend)
The frontend is built with React and provides:
- Modern, responsive UI
- Real-time updates using WebSocket
- File upload/download interface
- Chat functionality
- System monitoring dashboard

## Detailed Component Analysis

### Backend Components

#### 1. main.go
```go
package main

import (
    "database/sql"
    "log"
    "net/http"
    "os"
    "path/filepath"
    "github.com/gin-gonic/gin"
    _ "github.com/mattn/go-sqlite3"
)

func main() {
    // Initialize database
    db, err := sql.Open("sqlite3", "p2p.db")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    // Create uploads directory
    os.MkdirAll("uploads", 0755)

    // Initialize router
    r := gin.Default()

    // Add CORS middleware
    r.Use(corsMiddleware())

    // Setup routes
    setupRoutes(r, db)

    // Start server
    r.Run(":8080")
}
```
This is the entry point of the application. It:
- Initializes the SQLite database
- Creates necessary directories
- Sets up the HTTP router with CORS support
- Starts the server on port 8080

#### 2. database.go
```go
func initDB(db *sql.DB) error {
    // Create peers table
    _, err := db.Exec(`
        CREATE TABLE IF NOT EXISTS peers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            port INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `)
    if err != nil {
        return err
    }

    // Create files table
    _, err = db.Exec(`
        CREATE TABLE IF NOT EXISTS files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            size INTEGER NOT NULL,
            peer_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (peer_id) REFERENCES peers(id)
        )
    `)
    return err
}
```
Handles database initialization and schema:
- Creates tables for peers and files
- Sets up relationships between tables
- Manages database connections

#### 3. file_handler.go
```go
func UploadFile(c *gin.Context, db *sql.DB) {
    // Get peer ID from form
    peerIDStr := c.PostForm("peer_id")
    peerID, err := strconv.Atoi(peerIDStr)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid peer_id"})
        return
    }

    // Check if peer exists
    var exists bool
    err = db.QueryRow("SELECT EXISTS(SELECT 1 FROM peers WHERE id = ?)", peerID).Scan(&exists)
    if err != nil || !exists {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid peer_id"})
        return
    }

    // Handle file upload
    file, err := c.FormFile("file")
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
        return
    }

    // Create peer directory
    peerDir := fmt.Sprintf("uploads/peer_%d", peerID)
    os.MkdirAll(peerDir, 0755)

    // Save file
    filename := filepath.Base(file.Filename)
    dst := filepath.Join(peerDir, filename)
    if err := c.SaveUploadedFile(file, dst); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
        return
    }

    // Save file info to database
    _, err = db.Exec("INSERT INTO files (filename, size, peer_id) VALUES (?, ?, ?)",
        filename, file.Size, peerID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file info"})
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "message": "File uploaded successfully",
        "filename": filename,
        "peer_id": peerID,
    })
}
```
Manages file operations:
- Handles file uploads
- Creates peer-specific directories
- Saves file metadata to database
- Validates peer IDs
- Manages file downloads

#### 4. websocket.go
```go
func WebSocketHandler(c *gin.Context, db *sql.DB) {
    // Get peer ID from query
    peerID := c.Query("peer_id")
    if peerID == "" {
        c.JSON(http.StatusBadRequest, gin.H{"error": "peer_id is required"})
        return
    }

    // Upgrade HTTP connection to WebSocket
    conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
    if err != nil {
        log.Printf("WebSocket upgrade failed: %v", err)
        return
    }
    defer conn.Close()

    // Add connection to clients map
    clients[peerID] = conn

    // Handle messages
    for {
        var msg Message
        err := conn.ReadJSON(&msg)
        if err != nil {
            log.Printf("Error reading message: %v", err)
            break
        }

        // Handle different message types
        switch msg.Type {
        case "broadcast":
            handleBroadcast(msg, peerID)
        case "direct":
            handleDirectMessage(msg, peerID)
        }
    }
}
```
Manages real-time communication:
- Handles WebSocket connections
- Processes different message types
- Manages peer connections
- Routes messages to appropriate recipients

### Frontend Components

#### 1. App.js
```javascript
function App() {
  const [isRegistered, setIsRegistered] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
  const [fileRefreshTrigger, setFileRefreshTrigger] = useState(0);

  // Handle peer registration
  const handleRegister = async (peerData) => {
    try {
      const response = await api.registerPeer(peerData);
      setIsRegistered(true);
      setNotification({
        open: true,
        message: `Successfully registered as Peer ${response.id}`,
        severity: 'success'
      });
    } catch (error) {
      setNotification({
        open: true,
        message: error.message,
        severity: 'error'
      });
    }
  };

  // Handle feature selection
  const handleFeatureSelect = (feature) => {
    setSelectedFeature(feature);
  };

  // Render feature components
  const getFeatureComponent = () => {
    switch (selectedFeature.id) {
      case 'sources':
        return (
          <FileRefreshContext.Provider value={fileRefreshContextValue}>
            <FileSources />
          </FileRefreshContext.Provider>
        );
      case 'download':
        return (
          <FileRefreshContext.Provider value={fileRefreshContextValue}>
            <FileDownload />
          </FileRefreshContext.Provider>
        );
      // ... other cases
    }
  };
}
```
Main application component:
- Manages application state
- Handles peer registration
- Controls feature selection
- Provides notification system
- Manages file refresh context

#### 2. FileUpload.js
```javascript
function FileUpload() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('peer_id', localStorage.getItem('peerId'));

    try {
      setIsUploading(true);
      await api.uploadFile(formData, (progress) => {
        setUploadProgress(progress);
      });
      setNotification({
        open: true,
        message: 'File uploaded successfully',
        severity: 'success'
      });
    } catch (error) {
      setNotification({
        open: true,
        message: error.message,
        severity: 'error'
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };
}
```
Handles file uploads:
- Manages file selection
- Shows upload progress
- Handles upload errors
- Provides user feedback

#### 3. FileDownload.js
```javascript
function FileDownload() {
  const [peers, setPeers] = useState([]);
  const [selectedPeer, setSelectedPeer] = useState('');
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const handleDownload = async () => {
    if (!selectedFile) return;

    try {
      const response = await api.downloadFile(selectedFile.id, selectedPeer);
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = selectedFile.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      setNotification({
        open: true,
        message: error.message,
        severity: 'error'
      });
    }
  };
}
```
Manages file downloads:
- Lists available files
- Handles peer selection
- Shows download progress
- Manages file downloads

#### 4. Chat.js
```javascript
function Chat() {
  const [activeStep, setActiveStep] = useState(0);
  const [senderPeer, setSenderPeer] = useState('');
  const [receivingPeers, setReceivingPeers] = useState([]);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    try {
      if (receivingPeers.includes('all')) {
        await websocketService.sendBroadcast(message);
      } else {
        for (const peerId of receivingPeers) {
          await websocketService.sendDirectMessage(peerId, message);
        }
      }
      setMessage('');
    } catch (error) {
      setNotification({
        open: true,
        message: error.message,
        severity: 'error'
      });
    }
  };
}
```
Handles real-time chat:
- Manages message sending
- Handles peer selection
- Shows message history
- Supports broadcast and direct messages

## API Services

### api.js
```javascript
const api = {
  // Check server status
  checkServers: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/status`);
      return response.ok;
    } catch (error) {
      console.error('Error checking servers:', error);
      return false;
    }
  },

  // Register new peer
  registerPeer: async (peerData) => {
    const response = await fetch(`${API_BASE_URL}/peers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(peerData),
    });
    if (!response.ok) throw new Error('Failed to register peer');
    return response.json();
  },

  // Upload file
  uploadFile: async (formData, onProgress) => {
    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) throw new Error('Failed to upload file');
    return response.json();
  },

  // Download file
  downloadFile: async (fileId, peerId) => {
    const response = await fetch(`${API_BASE_URL}/download/${fileId}?peer_id=${peerId}`);
    if (!response.ok) throw new Error('Failed to download file');
    return response;
  }
};
```
Provides API communication:
- Handles HTTP requests
- Manages file uploads/downloads
- Provides error handling
- Supports progress tracking

### websocket.js
```javascript
class WebSocketService {
  constructor() {
    this.socket = null;
    this.messageHandlers = new Set();
  }

  connect(peerId) {
    this.socket = new WebSocket(`ws://localhost:8080/ws?peer_id=${peerId}`);
    
    this.socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.messageHandlers.forEach(handler => handler(message));
    };
  }

  sendDirectMessage(targetPeerId, message) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'direct',
        target: String(targetPeerId),
        message: message
      }));
    }
  }

  sendBroadcast(message) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'broadcast',
        message: message
      }));
    }
  }
}
```
Manages WebSocket communication:
- Handles real-time connections
- Processes messages
- Supports direct and broadcast messages
- Manages connection state

## Database Schema

### Peers Table
```sql
CREATE TABLE peers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    port INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```
Stores peer information:
- Unique ID
- Peer name
- Port number
- Registration timestamp

### Files Table
```sql
CREATE TABLE files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    size INTEGER NOT NULL,
    peer_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (peer_id) REFERENCES peers(id)
)
```
Stores file information:
- Unique ID
- Filename
- File size
- Owner peer ID
- Upload timestamp

## File System Structure
```
p2p-fileshare/
├── uploads/
│   ├── peer_1/
│   │   └── [uploaded files]
│   └── peer_2/
│       └── [uploaded files]
├── p2p.db
└── [source files]
```
Organizes uploaded files:
- Separate directory for each peer
- Maintains file ownership
- Easy file access and management

## Security Features
1. CORS protection
2. Input validation
3. File type checking
4. Peer authentication
5. Secure WebSocket connections

## Error Handling
1. Network errors
2. File operation errors
3. Database errors
4. WebSocket connection issues
5. Invalid input handling

## Future Improvements
1. File encryption
2. User authentication
3. File sharing permissions
4. Bandwidth optimization
5. File integrity verification 