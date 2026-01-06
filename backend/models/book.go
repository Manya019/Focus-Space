package models

import "time"

type Book struct {
	ID          int       `json:"id"`
	Title       string    `json:"title"`
	Author      string    `json:"author"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
}

type Review struct {
	ID         int       `json:"id"`
	BookID     int       `json:"book_id"`
	UserID     int       `json:"user_id"`
	Rating     int       `json:"rating"`
	ReviewText string    `json:"review_text"`
	CreatedAt  time.Time `json:"created_at"`
	Username   string    `json:"username"`
}
