package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"readingroom/db"
	"readingroom/models"
	"readingroom/utils"
)

type createMessageRequest struct {
	Channel string `json:"channel" binding:"required"`
	Body    string `json:"body" binding:"required"`
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

	var id int64
	err = db.DB.QueryRow(`
		INSERT INTO messages (user_id, channel, body, created_at)
		VALUES ($1, $2, $3, NOW()) RETURNING id`,
		claims.UserID, req.Channel, req.Body,
	).Scan(&id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not save message"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"id": id, "status": "saved"})
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
		SELECT m.id, m.user_id, m.channel, m.body, m.created_at, u.username, u.email
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
		if err := rows.Scan(&m.ID, &m.UserID, &m.Channel, &m.Body, &m.CreatedAt, &m.Username, &m.Email); err != nil {
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

