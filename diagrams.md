# System Diagrams

## 1. Overall System Architecture
```mermaid
graph TB
    subgraph Frontend
        UI[User Interface]
        WS[WebSocket Client]
        API[API Client]
    end
    
    subgraph Backend
        Router[Router]
        DB[(SQLite DB)]
        FS[File System]
        WS_Server[WebSocket Server]
    end
    
    subgraph Peers
        P1[Peer 1]
        P2[Peer 2]
        P3[Peer 3]
    end
    
    UI --> WS
    UI --> API
    WS --> WS_Server
    API --> Router
    Router --> DB
    Router --> FS
    WS_Server --> P1
    WS_Server --> P2
    WS_Server --> P3
```

## 2. Backend Architecture
```mermaid
graph LR
    subgraph API Layer
        REST[REST API]
        WS[WebSocket]
    end
    
    subgraph Data Layer
        DB[(SQLite DB)]
        FS[File System]
    end
    
    subgraph Business Logic
        PM[Peer Manager]
        FM[File Manager]
        CM[Chat Manager]
    end
    
    REST --> PM
    REST --> FM
    WS --> CM
    PM --> DB
    FM --> DB
    FM --> FS
    CM --> DB
```

## 3. Frontend Architecture
```mermaid
graph TB
    subgraph Components
        App[App Component]
        FileUpload[File Upload]
        FileDownload[File Download]
        Chat[Chat]
        Status[Status Monitor]
    end
    
    subgraph Services
        API[API Service]
        WS[WebSocket Service]
    end
    
    subgraph State Management
        Context[React Context]
        LocalStorage[Local Storage]
    end
    
    App --> FileUpload
    App --> FileDownload
    App --> Chat
    App --> Status
    
    FileUpload --> API
    FileDownload --> API
    Chat --> WS
    Status --> API
    
    API --> Context
    WS --> Context
    Context --> LocalStorage
```

## 4. File Upload Process
```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Database
    participant FileSystem
    
    User->>Frontend: Select File
    Frontend->>Backend: Upload Request
    Backend->>Database: Validate Peer
    Database-->>Backend: Peer Valid
    Backend->>FileSystem: Save File
    FileSystem-->>Backend: File Saved
    Backend->>Database: Update Metadata
    Database-->>Backend: Updated
    Backend-->>Frontend: Success Response
    Frontend-->>User: Upload Complete
```

## 5. File Download Process
```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Database
    participant FileSystem
    
    User->>Frontend: Select File
    Frontend->>Backend: Download Request
    Backend->>Database: Get File Info
    Database-->>Backend: File Info
    Backend->>FileSystem: Read File
    FileSystem-->>Backend: File Data
    Backend-->>Frontend: File Stream
    Frontend-->>User: Download Complete
```

## 6. Real-time Communication Process
```mermaid
sequenceDiagram
    participant Sender
    participant WS_Client
    participant WS_Server
    participant Receiver
    
    Sender->>WS_Client: Send Message
    WS_Client->>WS_Server: WebSocket Message
    WS_Server->>Receiver: Forward Message
    Receiver-->>WS_Server: Message Received
    WS_Server-->>WS_Client: Delivery Confirmation
    WS_Client-->>Sender: Message Sent
```

## 7. System State Management
```mermaid
stateDiagram-v2
    [*] --> Unregistered
    Unregistered --> Registered: Register Peer
    Registered --> Uploading: Start Upload
    Uploading --> Registered: Upload Complete
    Registered --> Downloading: Start Download
    Downloading --> Registered: Download Complete
    Registered --> Chatting: Start Chat
    Chatting --> Registered: End Chat
    Registered --> [*]: Unregister
``` 