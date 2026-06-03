package db

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	_ "github.com/lib/pq"
)

// DB is the shared database handle.
var DB *sql.DB

// ConnectDB initializes the global DB connection using environment variables.
// Required env vars: DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME
func ConnectDB() error {
	host := os.Getenv("DB_HOST")
	port := getenv("DB_PORT", "5432")
	user := os.Getenv("DB_USER")
	pass := os.Getenv("DB_PASS")
	name := os.Getenv("DB_NAME")

	if host == "" || user == "" || pass == "" || name == "" {
		return fmt.Errorf("missing required database environment variables: DB_HOST, DB_USER, DB_PASS, DB_NAME")
	}

	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=require", host, port, user, pass, name)

	var err error
	DB, err = sql.Open("postgres", dsn)
	if err != nil {
		log.Printf("[DB] Failed to open connection: %v", err)
		return err
	}

	// Set connection pool settings
	DB.SetMaxOpenConns(25)
	DB.SetMaxIdleConns(5)
	DB.SetConnMaxLifetime(5 * time.Minute)

	// Try to ping with retries
	for i := 0; i < 5; i++ {
		if err = DB.Ping(); err == nil {
			log.Println("[DB] Connected successfully!")
			break
		}
		log.Printf("[DB] Ping attempt %d/5 failed: %v. Retrying...", i+1, err)
		time.Sleep(time.Second * time.Duration(i+1))
	}

	if err != nil {
		log.Printf("[DB] Failed to ping after retries: %v", err)
		return err
	}

	// Initialize schema
	if err := initSchema(); err != nil {
		log.Printf("[DB] Schema initialization failed: %v", err)
		return err
	}

	log.Println("[DB] All migrations completed successfully")
	return nil
}

// initSchema ensures all tables exist and runs migrations
func initSchema() error {
	migrations := []struct {
		name string
		sql  string
	}{
		{
			"Create users table",
			`CREATE TABLE IF NOT EXISTS users (
				id TEXT PRIMARY KEY,
				username TEXT NOT NULL,
				email TEXT UNIQUE NOT NULL,
				password_hash TEXT DEFAULT '',
				genre TEXT DEFAULT '',
				about TEXT DEFAULT '',
				likes TEXT DEFAULT '',
				xp INTEGER DEFAULT 0,
				level INTEGER DEFAULT 1,
				streak INTEGER DEFAULT 0,
				last_activity TIMESTAMP WITH TIME ZONE,
				created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
			)`,
		},
		{
			"Create reading_logs table",
			`CREATE TABLE IF NOT EXISTS reading_logs (
				id SERIAL PRIMARY KEY,
				user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
				book_name TEXT NOT NULL,
				pages_read INTEGER NOT NULL,
				target_pages INTEGER DEFAULT 0,
				reflection TEXT DEFAULT '',
				duration_minutes INTEGER DEFAULT 0,
				created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
			)`,
		},
		{
			"Create user_notifications table",
			`CREATE TABLE IF NOT EXISTS user_notifications (
				user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
				enabled BOOLEAN DEFAULT FALSE,
				notify_time TEXT DEFAULT '09:00'
			)`,
		},
		{
			"Create messages table",
			`CREATE TABLE IF NOT EXISTS messages (
				id SERIAL PRIMARY KEY,
				user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
				channel TEXT NOT NULL,
				body TEXT NOT NULL,
				reply_to_id INTEGER REFERENCES messages(id) ON DELETE SET NULL,
				created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
			)`,
		},
		{
			"Create books table",
			`CREATE TABLE IF NOT EXISTS books (
				id SERIAL PRIMARY KEY,
				title TEXT NOT NULL,
				author TEXT NOT NULL,
				description TEXT DEFAULT '',
				cover_url TEXT DEFAULT '',
				created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
			)`,
		},
		{
			"Create reviews table",
			`CREATE TABLE IF NOT EXISTS reviews (
				id SERIAL PRIMARY KEY,
				book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
				user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
				rating INTEGER CHECK (rating >= 1 AND rating <= 5),
				review_text TEXT NOT NULL,
				created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
			)`,
		},
		{"Add books cover_url column", `ALTER TABLE books ADD COLUMN IF NOT EXISTS cover_url TEXT DEFAULT ''`},
		{"Add users xp column", `ALTER TABLE users ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0`},
		{"Add users level column", `ALTER TABLE users ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1`},
		{"Add users streak column", `ALTER TABLE users ADD COLUMN IF NOT EXISTS streak INTEGER DEFAULT 0`},
		{"Add users last_activity column", `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP WITH TIME ZONE`},
		{"Add reading_logs target_pages column", `ALTER TABLE reading_logs ADD COLUMN IF NOT EXISTS target_pages INTEGER DEFAULT 0`},
		{"Add reading_logs reflection column", `ALTER TABLE reading_logs ADD COLUMN IF NOT EXISTS reflection TEXT DEFAULT ''`},
		{"Add reading_logs duration_minutes column", `ALTER TABLE reading_logs ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 0`},
		{"Create messages index", `CREATE INDEX IF NOT EXISTS idx_messages_channel_created ON messages(channel, created_at DESC)`},
		{"Create messages reply index", `CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id ON messages(reply_to_id)`},
	}

	for _, m := range migrations {
		if _, err := DB.Exec(m.sql); err != nil {
			log.Printf("[DB MIGRATION] %s: FAILED - %v", m.name, err)
			return err
		}
		log.Printf("[DB MIGRATION] %s: OK", m.name)
	}

	return nil
}

// CheckDB returns the current DB status
func CheckDB() error {
	if DB == nil {
		return fmt.Errorf("database not initialized")
	}
	return DB.Ping()
}

func getenv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
