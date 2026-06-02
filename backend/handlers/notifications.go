package handlers

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"

	"readingroom/db"
	"readingroom/models"
)

type notificationPrefRequest struct {
	UserID     string `json:"user_id" binding:"required"`
	Enabled    bool   `json:"enabled"`
	NotifyTime string `json:"notify_time"`
}

// GetNotifications handles GET /notifications/:user_id
func GetNotifications(c *gin.Context) {
	uid := c.Param("user_id")
	if uid == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	var n models.Notification
	err := db.DB.QueryRow(`
		SELECT user_id, enabled, notify_time FROM user_notifications WHERE user_id=$1`,
		uid).Scan(&n.UserID, &n.Enabled, &n.NotifyTime)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusOK, gin.H{"enabled": false})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "query failed"})
		return
	}

	c.JSON(http.StatusOK, n)
}

// SetNotificationPrefs handles POST /notifications/preferences
func SetNotificationPrefs(c *gin.Context) {
	var req notificationPrefRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	_, err := db.DB.Exec(`
		INSERT INTO user_notifications (user_id, enabled, notify_time)
		VALUES ($1, $2, $3)
		ON CONFLICT (user_id) DO UPDATE SET enabled=$2, notify_time=$3`,
		req.UserID, req.Enabled, req.NotifyTime)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not save preferences"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "saved"})
}

// UnsubscribeNotifications handles GET /notifications/unsubscribe/:user_id
func UnsubscribeNotifications(c *gin.Context) {
	uid := c.Param("user_id")
	if uid == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	// Disable notifications for this user
	_, err := db.DB.Exec(`
		INSERT INTO user_notifications (user_id, enabled, notify_time)
		VALUES ($1, false, '09:00')
		ON CONFLICT (user_id) DO UPDATE SET enabled = false
	`, uid)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not unsubscribe"})
		return
	}

	c.Header("Content-Type", "text/html")
	c.String(http.StatusOK, `
		<!DOCTYPE html>
		<html>
		<head>
			<title>Unsubscribed</title>
			<style>
				body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #020617; color: white; }
				.success { color: #6366f1; }
			</style>
		</head>
		<body>
			<h1 class="success">Successfully Unsubscribed</h1>
			<p>You have been unsubscribed from reading reminders.</p>
			<p>You can re-enable notifications in your profile settings.</p>
		</body>
		</html>
	`)
}
