package db

import (
	"database/sql"
	"fmt"
	"os"

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
		return err
	}

	if err = DB.Ping(); err != nil {
		return err
	}

	if _, err = DB.Exec(`ALTER TABLE books ADD COLUMN IF NOT EXISTS cover_url TEXT DEFAULT ''`); err != nil {
		return err
	}

	migrations := []string{
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS streak INTEGER DEFAULT 0`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP WITH TIME ZONE`,
		`ALTER TABLE reading_logs ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 0`,
	}

	for _, migration := range migrations {
		if _, err = DB.Exec(migration); err != nil {
			return err
		}
	}

	// log.Println("connected to postgres")
	return nil
}

func getenv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
