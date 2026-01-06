package models

import "time"

type ReadingLog struct {
	ID          int64     `json:"id" db:"id"`
	UserID      int64     `json:"user_id" db:"user_id"`
	BookName    string    `json:"book_name" db:"book_name"`
	PagesRead   int       `json:"pages_read" db:"pages_read"`
	TargetPages int       `json:"target_pages" db:"target_pages"`
	Reflection  string    `json:"reflection" db:"reflection"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

