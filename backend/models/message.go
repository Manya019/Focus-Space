package models

import "time"

type Message struct {
	ID        int64     `json:"id" db:"id"`
	UserID    int64     `json:"user_id" db:"user_id"`
	Channel   string    `json:"channel" db:"channel"`
	Body      string    `json:"body" db:"body"`
	ReplyToID *int64    `json:"reply_to_id,omitempty" db:"reply_to_id"`
	Username  string    `json:"username,omitempty" db:"-"`
	Email     string    `json:"email,omitempty" db:"-"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

type WSMessage struct {
	Type      string      `json:"type"`    // "chat", "presence", "join", "leave"
	Channel   string      `json:"channel"` // "reading_room", "general"
	Payload   interface{} `json:"payload,omitempty"`
	User      *WSUser     `json:"user,omitempty"`
	ID        int64       `json:"id,omitempty"`
	ReplyToID *int64      `json:"reply_to_id,omitempty"`
	Body      string      `json:"body,omitempty"`
	CreatedAt time.Time   `json:"created_at,omitempty"`
}

type WSUser struct {
	ID          int64  `json:"id"`
	Username    string `json:"username"`
	Email       string `json:"email"`
	Book        string `json:"book,omitempty"`
	TargetPages int    `json:"target_pages,omitempty"`
}
