package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/gorilla/mux"
)

func main() {
	InitDB()

	router := mux.NewRouter()

	router.HandleFunc("/register", RegisterPeer).Methods("POST", "OPTIONS")
	router.HandleFunc("/peers", GetPeers).Methods("GET", "OPTIONS")
	router.HandleFunc("/upload", UploadFile).Methods("POST", "OPTIONS")
	router.HandleFunc("/files", GetFiles).Methods("GET", "OPTIONS")
	router.HandleFunc("/sources/{hash}", GetFileSources).Methods("GET", "OPTIONS")
	router.HandleFunc("/download", DownloadFileHandler).Methods("POST", "OPTIONS")
	router.HandleFunc("/ws", WebSocketHandler)
	router.HandleFunc("/peer_files/{peer_id}", GetPeerFiles).Methods("GET", "OPTIONS")

	// Apply CORS middleware to all routes
	handler := CORS(router)

	port := "8080"
	fmt.Println("Tracker running on port", port)
	go func() {
		log.Fatal(http.ListenAndServe(":"+port, handler))
	}()

	go ServeFiles()

	select {}
}
