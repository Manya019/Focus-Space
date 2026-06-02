package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/lib/pq"
	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load()
	
	host := os.Getenv("DB_HOST")
	port := os.Getenv("DB_PORT")
	user := os.Getenv("DB_USER")
	pass := os.Getenv("DB_PASS")
	name := os.Getenv("DB_NAME")

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=require", user, pass, host, port, name)
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	queries := []string{
		"ALTER TABLE users ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;",
		"ALTER TABLE users ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;",
		"ALTER TABLE users ADD COLUMN IF NOT EXISTS streak INTEGER DEFAULT 0;",
		"ALTER TABLE users ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP WITH TIME ZONE;",
		"ALTER TABLE reading_logs ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 0;",
	}

	for _, q := range queries {
		fmt.Printf("Executing: %s\n", q)
		_, err := db.Exec(q)
		if err != nil {
			log.Printf("Error executing %s: %v", q, err)
		}
	}

	fmt.Println("Migration completed successfully.")
}
