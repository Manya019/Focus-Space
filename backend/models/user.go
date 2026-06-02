package models

import "time"

type User struct {
	ID           string    `json:"id" db:"id"`
	Username     string    `json:"username" db:"username"`
	Email        string    `json:"email" db:"email"`
	PasswordHash string    `json:"-" db:"password_hash"`
	Genre        string    `json:"genre" db:"genre"`
	About        string    `json:"about" db:"about"`
	Likes        string    `json:"likes" db:"likes"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
}

