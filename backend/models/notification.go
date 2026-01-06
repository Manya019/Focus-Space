package models

type Notification struct {
	UserID    int64  `json:"user_id" db:"user_id"`
	Enabled   bool   `json:"enabled" db:"enabled"`
	NotifyTime string `json:"notify_time" db:"notify_time"`
}

