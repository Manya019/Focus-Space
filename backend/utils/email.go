package utils

import (
	"fmt"
	"net/smtp"
	"os"
	"strconv"
	"strings"
	"time"
)

type EmailService struct {
	smtpHost string
	smtpPort string
	username string
	password string
	from     string
}

func NewEmailService() *EmailService {
	return &EmailService{
		smtpHost: getEnv("SMTP_HOST", "smtp.gmail.com"),
		smtpPort: getEnv("SMTP_PORT", "587"),
		username: getEnv("SMTP_USERNAME", ""),
		password: getEnv("SMTP_PASSWORD", ""),
		from:     getEnv("SMTP_FROM", ""),
	}
}

func (e *EmailService) SendEmail(to, subject, body string) error {
	if e.username == "" || e.password == "" {
		return fmt.Errorf("SMTP credentials not configured")
	}

	// Set up authentication
	auth := smtp.PlainAuth("", e.username, e.password, e.smtpHost)

	// Construct the email
	msg := []byte(fmt.Sprintf("To: %s\r\nSubject: %s\r\n\r\n%s\r\n", to, subject, body))

	// Send email
	addr := e.smtpHost + ":" + e.smtpPort
	err := smtp.SendMail(addr, auth, e.from, []string{to}, msg)
	if err != nil {
		return fmt.Errorf("failed to send email: %v", err)
	}

	return nil
}

func (e *EmailService) SendReadingReminder(to, username string, unreadBooks int, userID string) error {
	subject := "FocusSpace - Daily Reading Reminder"

	unsubscribeURL := fmt.Sprintf("http://localhost:5173/notifications/unsubscribe/%s", userID)

	body := fmt.Sprintf(`Hi %s,

This is your daily reading reminder from FocusSpace!

You have %d books waiting to be read. Keep up the great work!

Happy reading!
The FocusSpace Team

---
To unsubscribe from these reminders, click here: %s
Or update your notification preferences in your profile.
`, username, unreadBooks, unsubscribeURL)

	return e.SendEmail(to, subject, body)
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// ParseTime parses a time string in HH:MM format
func ParseTime(timeStr string) (time.Time, error) {
	parts := strings.Split(timeStr, ":")
	if len(parts) != 2 {
		return time.Time{}, fmt.Errorf("invalid time format")
	}

	hour, err := strconv.Atoi(parts[0])
	if err != nil {
		return time.Time{}, err
	}

	minute, err := strconv.Atoi(parts[1])
	if err != nil {
		return time.Time{}, err
	}

	now := time.Now()
	return time.Date(now.Year(), now.Month(), now.Day(), hour, minute, 0, 0, now.Location()), nil
}
