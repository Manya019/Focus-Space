package handlers

import (
	"database/sql"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"readingroom/db"
	"readingroom/models"
	"readingroom/utils"
)

type createMessageRequest struct {
	Channel   string `json:"channel" binding:"required"`
	Body      string `json:"body" binding:"required"`
	ReplyToID *int64 `json:"reply_to_id"`
}

// CreateMessage handles POST /messages
func CreateMessage(c *gin.Context) {
	// For now, let's accept a user_id from the body or header if token parsing fails
	// because Clerk tokens use RS256 and our current utils use HS256.
	// In a real app, you'd use a Clerk middleware here.
	userID := c.GetHeader("X-User-ID")
	if userID == "" {
		token := c.GetHeader("Authorization")
		if claims, err := utils.ParseToken(token); err == nil {
			userID = claims.UserID
		}
	}

	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing or invalid user id"})
		return
	}

	// Auto-sync user if not exists
	if err := ensureUser(userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "user sync failed", "details": err.Error()})
		return
	}

	var req createMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Channel != "general" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "only general channel messages are persisted"})
		return
	}

	var (
		id        int64
		createdAt time.Time
	)
	err := db.DB.QueryRow(`
		INSERT INTO messages (user_id, channel, body, reply_to_id, created_at)
		VALUES ($1, $2, $3, $4, NOW())
		RETURNING id, created_at`,
		userID, req.Channel, req.Body, req.ReplyToID,
	).Scan(&id, &createdAt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not save message", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":          id,
		"created_at":  createdAt,
		"reply_to_id": req.ReplyToID,
		"status":      "saved",
	})
}

// GetMessages handles GET /messages/:channel
func GetMessages(c *gin.Context) {
	channel := c.Param("channel")
	if channel != "general" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "only general channel is supported"})
		return
	}

	limit := 50
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}

	q := "SELECT m.id, m.user_id, m.channel, m.body, m.reply_to_id, m.created_at, u.username, u.email " +
		"FROM messages m JOIN users u ON m.user_id = u.id " +
		"WHERE m.channel = $1 ORDER BY m.created_at DESC LIMIT $2"
	rows, err := db.DB.Query(q, channel, limit)
	if err != nil {
		log.Printf("GetMessages query failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "query failed", "details": err.Error()})
		return
	}
	defer rows.Close()

	var messages []models.Message
	for rows.Next() {
		var m models.Message
		if err := rows.Scan(&m.ID, &m.UserID, &m.Channel, &m.Body, &m.ReplyToID, &m.CreatedAt, &m.Username, &m.Email); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "scan failed"})
			return
		}
		messages = append(messages, m)
	}

	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}

	if messages == nil {
		messages = []models.Message{}
	}

	c.JSON(http.StatusOK, messages)
}

// DeleteMessage handles DELETE /messages/:id
func DeleteMessage(c *gin.Context) {
	userID := c.GetHeader("X-User-ID")
	if userID == "" {
		token := c.GetHeader("Authorization")
		if claims, err := utils.ParseToken(token); err == nil {
			userID = claims.UserID
		}
	}

	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing user id"})
		return
	}

	idParam := c.Param("id")

	var ownerID string
	err := db.DB.QueryRow(`SELECT user_id FROM messages WHERE id=$1`, idParam).Scan(&ownerID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "message not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "query failed"})
		return
	}

	if ownerID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "cannot delete another user's message"})
		return
	}

	if _, err := db.DB.Exec(`DELETE FROM messages WHERE id=$1`, idParam); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "delete failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "deleted", "id": idParam})
}
