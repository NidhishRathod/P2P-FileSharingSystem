package main

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"os"
)

func GenerateFileHash(filePath string) string {
	file, err := os.Open(filePath)
	if err != nil {
		fmt.Println("Error opening file:", err)
		return ""
	}
	defer file.Close()

	hash := sha256.New()
	if _, err := io.Copy(hash, file); err != nil {
		fmt.Println("Error computing hash:", err)
		return ""
	}

	return hex.EncodeToString(hash.Sum(nil))
}

func VerifyFileIntegrity(filePath, expectedHash string) bool {
	return GenerateFileHash(filePath) == expectedHash
}
