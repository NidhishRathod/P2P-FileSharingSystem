package main

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

var connections = make(map[string]*websocket.Conn)
var connLock sync.Mutex

type Message struct {
	Type    string `json:"type"`
	Target  string `json:"target"`
	Message string `json:"message"`
}

func WebSocketHandler(w http.ResponseWriter, r *http.Request) {
	peerID := r.URL.Query().Get("peer_id")
	if peerID == "" {
		http.Error(w, "Missing peer_id", http.StatusBadRequest)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket upgrade error:", err)
		return
	}

	connLock.Lock()
	connections[peerID] = conn
	connLock.Unlock()
	log.Println("Peer registered:", peerID)

	defer func() {
		connLock.Lock()
		delete(connections, peerID)
		connLock.Unlock()
		log.Println("Peer disconnected:", peerID)
		conn.Close()
	}()

	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			log.Println("WebSocket read error:", err)
			break
		}

		var message Message
		if err := json.Unmarshal(msg, &message); err != nil {
			log.Println("Invalid message format:", err)
			continue
		}

		if message.Type == "broadcast" {
			log.Printf("Broadcasting message from %s: %s", peerID, message.Message)
			broadcastMessage(peerID, []byte(message.Message))
		} else if message.Type == "direct" {
			log.Printf("Direct message from %s to %s: %s", peerID, message.Target, message.Message)
			sendDirectMessage(peerID, message.Target, []byte(message.Message))
		} else {
			log.Println("Invalid message type received")
		}
	}
}

func broadcastMessage(senderID string, msg []byte) {
	connLock.Lock()
	defer connLock.Unlock()

	for peerID, conn := range connections {
		if peerID != senderID {
			err := conn.WriteMessage(websocket.TextMessage, msg)
			if err != nil {
				log.Println("WebSocket broadcast error:", err)
			}
		}
	}
}

func sendDirectMessage(senderID, targetPeerID string, msg []byte) {
	connLock.Lock()
	targetConn, exists := connections[targetPeerID]
	connLock.Unlock()

	if !exists {
		log.Println("Target peer", targetPeerID, "not found")
		return
	}

	err := targetConn.WriteMessage(websocket.TextMessage, msg)
	if err != nil {
		log.Println("Failed to send direct message to", targetPeerID, ":", err)
	}
}
