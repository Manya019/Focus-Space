package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	// Load .env file from backend directory
	envPath := ".env"
	if _, err := os.Stat(envPath); os.IsNotExist(err) {
		envPath = filepath.Join("..", ".env")
	}
	if err := godotenv.Load(envPath); err != nil {
		log.Printf("Warning: Could not load .env file: %v. Using environment variables.\n", err)
	}

	// Build connection string
	host := os.Getenv("DB_HOST")
	port := os.Getenv("DB_PORT")
	if port == "" {
		port = "5432"
	}
	user := os.Getenv("DB_USER")
	pass := os.Getenv("DB_PASS")
	name := os.Getenv("DB_NAME")

	if host == "" || user == "" || pass == "" || name == "" {
		log.Fatal("Missing required database environment variables: DB_HOST, DB_USER, DB_PASS, DB_NAME")
	}

	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=require", host, port, user, pass, name)

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}
	defer db.Close()

	if err = db.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}

	log.Println("Connected to database, running schema...")

	// Read schema file (from backend directory)
	schemaPath := "schema.sql"
	if _, err := os.Stat(schemaPath); os.IsNotExist(err) {
		schemaPath = filepath.Join("..", "schema.sql")
	}
	schemaBytes, err := os.ReadFile(schemaPath)
	if err != nil {
		log.Fatalf("Failed to read schema.sql: %v", err)
	}

	// Execute the entire schema (PostgreSQL handles multiple statements)
	schema := string(schemaBytes)
	// Remove comments
	lines := strings.Split(schema, "\n")
	var cleanLines []string
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if !strings.HasPrefix(trimmed, "--") && trimmed != "" {
			cleanLines = append(cleanLines, line)
		}
	}
	schema = strings.Join(cleanLines, "\n")
	
	if _, err := db.Exec(schema); err != nil {
		log.Fatalf("Failed to execute schema: %v", err)
	}

	log.Println("Schema migration completed!")
}


