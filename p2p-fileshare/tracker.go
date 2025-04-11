package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
)

type Peer struct {
	ID   int    `json:"id,omitempty"`
	IP   string `json:"ip"`
	Port int    `json:"port"`
}

func RegisterPeer(w http.ResponseWriter, r *http.Request) {
	var peer Peer
	if err := json.NewDecoder(r.Body).Decode(&peer); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	var assignedPort int
	err := db.QueryRow("SELECT COALESCE(MAX(port), 8999) + 1 FROM peers").Scan(&assignedPort)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	peer.Port = assignedPort

	result, err := db.Exec("INSERT INTO peers (ip, port) VALUES (?, ?)", peer.IP, peer.Port)
	if err != nil {
		http.Error(w, "Failed to register peer", http.StatusInternalServerError)
		return
	}
	peerID, _ := result.LastInsertId()

	peerDir := fmt.Sprintf("uploads/peer_%d", peerID)
	if err := os.MkdirAll(peerDir, os.ModePerm); err != nil {
		http.Error(w, "Failed to create peer directory", http.StatusInternalServerError)
		return
	}

	peer.ID = int(peerID)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(peer)
}

func GetPeers(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query("SELECT id, ip, port FROM peers")
	if err != nil {
		http.Error(w, "Failed to retrieve peers", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var peers []Peer
	for rows.Next() {
		var peer Peer
		if err := rows.Scan(&peer.ID, &peer.IP, &peer.Port); err != nil {
			http.Error(w, "Error scanning peer", http.StatusInternalServerError)
			return
		}
		peers = append(peers, peer)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(peers)
}
