package utils

import (
	"fmt"
	"log"
	"time"

	"readingroom/db"
)

type NotificationScheduler struct {
	emailService *EmailService
}

func NewNotificationScheduler() *NotificationScheduler {
	return &NotificationScheduler{
		emailService: NewEmailService(),
	}
}

func (ns *NotificationScheduler) Start() {
	// Check every minute for users who need notifications
	ticker := time.NewTicker(1 * time.Minute)
	go func() {
		defer func() {
			if r := recover(); r != nil {
				log.Printf("[Scheduler] PANIC recovered: %v", r)
			}
		}()
		for range ticker.C {
			ns.checkAndSendNotifications()
		}
	}()
}

func (ns *NotificationScheduler) checkAndSendNotifications() {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("[Scheduler] PANIC in checkAndSendNotifications: %v", r)
		}
	}()

	// Triple-check DB is ready before any query
	if db.DB == nil {
		// Silently skip - DB might reconnect on next tick
		return
	}

	// Verify connection is still alive
	if err := db.CheckDB(); err != nil {
		// Silently skip on this iteration
		return
	}

	// Get current time
	now := time.Now()
	currentTime := fmt.Sprintf("%02d:%02d", now.Hour(), now.Minute())

	// Find users who have notifications enabled for current time
	rows, err := db.DB.Query(`
		SELECT u.id, u.username, u.email, n.notify_time
		FROM users u
		JOIN user_notifications n ON u.id = n.user_id
		WHERE n.enabled = true AND n.notify_time = $1
	`, currentTime)

	if err != nil {
		log.Printf("[Scheduler] Query failed: %v", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var userID string
		var username, email, notifyTime string

		err := rows.Scan(&userID, &username, &email, &notifyTime)
		if err != nil {
			log.Printf("Error scanning notification row: %v", err)
			continue
		}

		// Count unread books (books not in reading logs or with incomplete logs)
		var unreadBooks int
		if db.DB == nil {
			log.Printf("[Scheduler] DB became nil while processing notifications, skipping for user %s", userID)
			continue
		}
		err = db.DB.QueryRow(`
			SELECT COUNT(*) FROM books b
			WHERE NOT EXISTS (
				SELECT 1 FROM reading_logs rl
				WHERE rl.user_id = $1 AND rl.book_name = b.title
				AND rl.pages_read >= rl.target_pages
			)
		`, userID).Scan(&unreadBooks)

		if err != nil {
			log.Printf("Error counting unread books for user %d: %v", userID, err)
			continue
		}

		// Send email if there are unread books
		if unreadBooks > 0 {
			err = ns.emailService.SendReadingReminder(email, username, unreadBooks, userID)
			if err != nil {
				log.Printf("Error sending email to %s: %v", email, err)
			} else {
				log.Printf("Sent reading reminder to %s (%d unread books)", email, unreadBooks)
			}
		}
	}
}
