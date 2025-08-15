package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gorilla/mux"
)

func main() {
	InitDB()

	router := mux.NewRouter()

	// Health check endpoint for cloud deployment
	router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	}).Methods("GET")

	router.HandleFunc("/register", RegisterPeer).Methods("POST", "OPTIONS")
	router.HandleFunc("/peers", GetPeers).Methods("GET", "OPTIONS")
	router.HandleFunc("/upload", UploadFile).Methods("POST", "OPTIONS")
	router.HandleFunc("/files", GetFiles).Methods("GET", "OPTIONS")
	router.HandleFunc("/sources/{hash}", GetFileSources).Methods("GET", "OPTIONS")
	router.HandleFunc("/download", DownloadFileHandler).Methods("POST", "OPTIONS")
	router.HandleFunc("/ws", WebSocketHandler)
	router.HandleFunc("/peer_files/{peer_id}", GetPeerFiles).Methods("GET", "OPTIONS")

	// Serve React frontend static files
	router.PathPrefix("/static/").Handler(http.StripPrefix("/static/", http.FileServer(http.Dir("frontend_build/static"))))

	// Serve React app for all other routes (SPA routing)
	router.PathPrefix("/").HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Check if the file exists in frontend_build
		filePath := filepath.Join("frontend_build", r.URL.Path)
		if _, err := os.Stat(filePath); os.IsNotExist(err) {
			// File doesn't exist, serve index.html for SPA routing
			http.ServeFile(w, r, "frontend_build/index.html")
		} else {
			// File exists, serve it
			http.ServeFile(w, r, filePath)
		}
	})

	// Apply CORS middleware to all routes
	handler := CORS(router)

	// Use environment variable for port (cloud deployment requirement)
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Println("Tracker running on port", port)
	go func() {
		log.Fatal(http.ListenAndServe(":"+port, handler))
	}()

	go ServeFiles()

	select {}
}
