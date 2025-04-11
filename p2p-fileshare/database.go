package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/mattn/go-sqlite3"
)

var db *sql.DB

func InitDB() {
	var err error
	db, err = sql.Open("sqlite3", "./p2p.db")
	if err != nil {
		log.Fatal("Database connection error:", err)
	}

	if err = db.Ping(); err != nil {
		log.Fatal("Database ping failed:", err)
	}

	_, err = db.Exec("PRAGMA foreign_keys = ON;")
	if err != nil {
		log.Fatal("Error enabling foreign keys:", err)
	}

	tx, err := db.Begin()
	if err != nil {
		log.Fatal("Error starting transaction:", err)
	}

	createTableQuery := `
	CREATE TABLE IF NOT EXISTS peers (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		ip TEXT NOT NULL,
		port INTEGER NOT NULL
	);

	CREATE TABLE IF NOT EXISTS files (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		filename TEXT NOT NULL,
		hash TEXT UNIQUE,
		filesize INTEGER DEFAULT 0
	);

	CREATE TABLE IF NOT EXISTS file_peers (  
		file_id INTEGER NOT NULL,
		peer_id INTEGER NOT NULL,
		PRIMARY KEY (file_id, peer_id),
		FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
		FOREIGN KEY (peer_id) REFERENCES peers(id) ON DELETE CASCADE
	);
	`

	_, err = tx.Exec(createTableQuery)
	if err != nil {
		tx.Rollback()
		log.Fatal("Error creating tables:", err)
	}

	err = tx.Commit()
	if err != nil {
		log.Fatal("Error committing transaction:", err)
	}

	fmt.Println("Database initialized successfully!")
}
