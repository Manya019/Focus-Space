package handlers

import (
	"database/sql"
	"readingroom/db"
)

// ensureUser checks if a user exists and creates a placeholder if not.
// This is useful for Clerk users who haven't visited their profile yet.
func ensureUser(userID string) error {
	var id string
	err := db.DB.QueryRow("SELECT id FROM users WHERE id = $1", userID).Scan(&id)
	if err == sql.ErrNoRows {
		// Create placeholder user
		_, err = db.DB.Exec(`
			INSERT INTO users (id, username, email, password_hash, created_at)
			VALUES ($1, $2, $3, '', NOW())`,
			userID, "New User", userID+"@clerk.user")
		return err
	}
	return err
}
