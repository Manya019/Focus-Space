package handlers

import (
	"database/sql"
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

// CreateMessage handles POST /messages (for general discussion persistence)
func CreateMessage(c *gin.Context) {
	// Extract user from token
	token := c.GetHeader("Authorization")
	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing token"})
		return
	}

	claims, err := utils.ParseToken(token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
		return
	}

	var req createMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Only persist general discussion messages
	if req.Channel != "general" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "only general channel messages are persisted"})
		return
	}

	var (
		id        int64
		createdAt time.Time
	)
	err = db.DB.QueryRow(`
		INSERT INTO messages (user_id, channel, body, reply_to_id, created_at)
		VALUES ($1, $2, $3, $4, NOW())
		RETURNING id, created_at`,
		claims.UserID, req.Channel, req.Body, req.ReplyToID,
	).Scan(&id, &createdAt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not save message"})
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

	rows, err := db.DB.Query(`
		SELECT m.id, m.user_id, m.channel, m.body, m.reply_to_id, m.created_at, u.username, u.email
		FROM messages m
		JOIN users u ON m.user_id = u.id
		WHERE m.channel = $1
		ORDER BY m.created_at DESC
		LIMIT $2`, channel, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "query failed"})
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

	// Reverse to show oldest first
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}

	if messages == nil {
		messages = []models.Message{}
	}

	c.JSON(http.StatusOK, messages)
}

// DeleteMessage handles DELETE /messages/:id (general channel only)
func DeleteMessage(c *gin.Context) {
	token := c.GetHeader("Authorization")
	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing token"})
		return
	}

	claims, err := utils.ParseToken(token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
		return
	}

	idParam := c.Param("id")
	msgID, err := strconv.ParseInt(idParam, 10, 64)
	if err != nil || msgID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid message id"})
		return
	}

	var ownerID int64
	err = db.DB.QueryRow(`SELECT user_id FROM messages WHERE id=$1`, msgID).Scan(&ownerID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "message not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "query failed"})
		return
	}

	if ownerID != claims.UserID {
		c.JSON(http.StatusForbidden, gin.H{"error": "cannot delete another user's message"})
		return
	}

	if _, err := db.DB.Exec(`DELETE FROM messages WHERE id=$1`, msgID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "delete failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "deleted", "id": msgID})
}
