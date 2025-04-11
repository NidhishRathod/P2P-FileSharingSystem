package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	"github.com/gorilla/mux"
)

type FileInfo struct {
	Hash     string `json:"hash"`
	Filename string `json:"filename"`
	Filesize int64  `json:"filesize"`
}

func GetFiles(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query("SELECT hash, filename, COALESCE(filesize, 0) FROM files")
	if err != nil {
		log.Println("Database error:", err)
		http.Error(w, "Failed to retrieve files", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var files []FileInfo
	for rows.Next() {
		var file FileInfo
		if err := rows.Scan(&file.Hash, &file.Filename, &file.Filesize); err != nil {
			log.Println("Error scanning file metadata:", err)
			http.Error(w, "Error scanning file metadata", http.StatusInternalServerError)
			return
		}
		files = append(files, file)
	}

	if err = rows.Err(); err != nil {
		log.Println("Error iterating over rows:", err)
		http.Error(w, "Error retrieving files", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(files); err != nil {
		log.Println("Error encoding JSON:", err)
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}

func GetFileSources(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	hash := vars["hash"]

	var fileID int
	err := db.QueryRow("SELECT id FROM files WHERE hash = ?", hash).Scan(&fileID)
	if err != nil {
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}

	rows, err := db.Query(`
		SELECT peers.ip, peers.port 
		FROM peers 
		JOIN file_peers ON peers.id = file_peers.peer_id 
		WHERE file_peers.file_id = ?`, fileID)
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var peers []Peer
	for rows.Next() {
		var peer Peer
		if err := rows.Scan(&peer.IP, &peer.Port); err != nil {
			http.Error(w, "Error scanning peer", http.StatusInternalServerError)
			return
		}
		peers = append(peers, peer)
	}

	if len(peers) == 0 {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte("[]"))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(peers)
}

func UploadFile(w http.ResponseWriter, r *http.Request) {
	err := r.ParseMultipartForm(10 << 20)
	if err != nil {
		http.Error(w, "Failed to parse form", http.StatusBadRequest)
		return
	}

	peerIDStr := r.FormValue("peer_id")
	if peerIDStr == "" {
		http.Error(w, "Missing peer_id", http.StatusBadRequest)
		return
	}

	peerID, err := strconv.Atoi(peerIDStr)
	if err != nil {
		http.Error(w, "Invalid peer_id format", http.StatusBadRequest)
		return
	}

	var exists bool
	err = db.QueryRow("SELECT EXISTS(SELECT 1 FROM peers WHERE id = ?)", peerID).Scan(&exists)
	if err != nil || !exists {
		http.Error(w, "Invalid peer_id", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Invalid file upload", http.StatusBadRequest)
		return
	}
	defer file.Close()

	peerDir := fmt.Sprintf("uploads/peer_%d", peerID)
	if _, err := os.Stat(peerDir); os.IsNotExist(err) {
		os.MkdirAll(peerDir, os.ModePerm)
	}

	filePath := filepath.Join(peerDir, header.Filename)
	out, err := os.Create(filePath)
	if err != nil {
		http.Error(w, "Failed to save file", http.StatusInternalServerError)
		return
	}
	defer out.Close()

	filesize, err := io.Copy(out, file)
	if err != nil {
		http.Error(w, "Error saving file", http.StatusInternalServerError)
		return
	}

	fileHash := GenerateFileHash(filePath)
	var fileID int
	err = db.QueryRow("SELECT id FROM files WHERE hash = ?", fileHash).Scan(&fileID)
	if err == sql.ErrNoRows {
		result, _ := db.Exec("INSERT INTO files (hash, filename, filesize) VALUES (?, ?, ?)", fileHash, header.Filename, filesize)
		lastID, _ := result.LastInsertId()
		fileID = int(lastID)
	}

	_, _ = db.Exec("INSERT OR IGNORE INTO file_peers (file_id, peer_id) VALUES (?, ?)", fileID, peerID)
	fmt.Fprintf(w, "File uploaded successfully to peer_%d with hash: %s", peerID, fileHash)
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Max-Age", "3600")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func ServeFiles() {
	router := mux.NewRouter()
	router.HandleFunc("/files/{peer_id}/{filename}", func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		peerID, filename := vars["peer_id"], vars["filename"]

		// Debug logging
		log.Printf("File Server: Received request for peer_id=%s, filename=%s", peerID, filename)

		filePath := filepath.Join("uploads", "peer_"+peerID, filename)
		log.Printf("File Server: Looking for file at path: %s", filePath)

		if _, err := os.Stat(filePath); os.IsNotExist(err) {
			log.Printf("File Server: File not found at path: %s", filePath)
			http.Error(w, "File not found", http.StatusNotFound)
			return
		}

		log.Printf("File Server: Serving file: %s", filePath)
		http.ServeFile(w, r, filePath)
	}).Methods("GET", "OPTIONS")

	// Apply CORS middleware to all routes
	handler := corsMiddleware(router)

	fmt.Println("Serving files on 0.0.0.0:9000...")
	log.Fatal(http.ListenAndServe("0.0.0.0:9000", handler))
}

func DownloadFileHandler(w http.ResponseWriter, r *http.Request) {
	peerID := r.FormValue("peer_id")
	sourcePeerID := r.FormValue("source_peer_id")
	filename := r.FormValue("filename")

	log.Printf("Download request: peer_id=%s, source_peer_id=%s, filename=%s",
		peerID, sourcePeerID, filename)

	var sourceIP string
	var sourcePort int
	err := db.QueryRow("SELECT ip, port FROM peers WHERE id = ?", sourcePeerID).Scan(&sourceIP, &sourcePort)
	if err != nil {
		log.Printf("Error finding source peer %s: %v", sourcePeerID, err)
		http.Error(w, "Source peer not found", http.StatusNotFound)
		return
	}

	log.Printf("Source peer found: IP=%s, Port=%d", sourceIP, sourcePort)

	// Update: Always use port 9000 for the file server since that's where it's running
	// The sourcePort in the database is for peer-to-peer communication, not file serving
	fileURL := fmt.Sprintf("http://%s:9000/files/%s/%s", sourceIP, sourcePeerID, filename)
	log.Printf("Attempting to download from URL: %s", fileURL)

	resp, err := http.Get(fileURL)
	if err != nil {
		log.Printf("Error fetching file: %v", err)
		http.Error(w, "Failed to fetch file from peer", http.StatusBadGateway)
		return
	}

	if resp.StatusCode != http.StatusOK {
		log.Printf("Error status code: %d", resp.StatusCode)
		http.Error(w, "Failed to fetch file from peer", http.StatusBadGateway)
		resp.Body.Close()
		return
	}

	defer resp.Body.Close()

	filePath := filepath.Join("uploads", "peer_"+peerID, filename)
	out, err := os.Create(filePath)
	if err != nil {
		http.Error(w, "Failed to save file", http.StatusInternalServerError)
		return
	}
	defer out.Close()

	filesize, err := io.Copy(out, resp.Body)
	if err != nil {
		http.Error(w, "Failed to save the downloaded file", http.StatusInternalServerError)
		return
	}

	fileHash := GenerateFileHash(filePath)

	var fileID int
	err = db.QueryRow("SELECT id FROM files WHERE hash = ?", fileHash).Scan(&fileID)
	if err == sql.ErrNoRows {
		result, _ := db.Exec("INSERT INTO files (hash, filename, filesize) VALUES (?, ?, ?)", fileHash, filename, filesize)
		lastID, _ := result.LastInsertId()
		fileID = int(lastID)
	}

	peerIDInt, _ := strconv.Atoi(peerID)
	_, _ = db.Exec("INSERT OR IGNORE INTO file_peers (file_id, peer_id) VALUES (?, ?)", fileID, peerIDInt)

	fmt.Fprintf(w, "File %s downloaded successfully by peer %s", filename, peerID)
}

func GetPeerFiles(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	peerID := vars["peer_id"]

	rows, err := db.Query(`
		SELECT files.hash, files.filename, files.filesize 
		FROM files 
		JOIN file_peers ON files.id = file_peers.file_id 
		WHERE file_peers.peer_id = ?`, peerID)

	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var files []FileInfo
	for rows.Next() {
		var file FileInfo
		if err := rows.Scan(&file.Hash, &file.Filename, &file.Filesize); err != nil {
			http.Error(w, "Error scanning file data", http.StatusInternalServerError)
			return
		}
		files = append(files, file)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(files)
}
