package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"readingroom/db"
	"readingroom/models"
)

type createLogRequest struct {
	UserID      int64  `json:"user_id" binding:"required"`
	BookName    string `json:"book_name" binding:"required"`
	PagesRead   int    `json:"pages_read" binding:"required"`
	TargetPages int    `json:"target_pages"`
	Reflection  string `json:"reflection"`
}

// CreateLog handles POST /logs
func CreateLog(c *gin.Context) {
	var req createLogRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	_, err := db.DB.Exec(`
		INSERT INTO reading_logs (user_id, book_name, pages_read, target_pages, reflection, created_at)
		VALUES ($1, $2, $3, $4, $5, NOW())`,
		req.UserID, req.BookName, req.PagesRead, req.TargetPages, req.Reflection)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not save log"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "logged"})
}

// GetLogs handles GET /logs/:user_id
func GetLogs(c *gin.Context) {
	uid, err := strconv.ParseInt(c.Param("user_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	rows, err := db.DB.Query(`
		SELECT id, user_id, book_name, pages_read, target_pages, reflection, created_at
		FROM reading_logs WHERE user_id=$1 ORDER BY created_at DESC`, uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "query failed"})
		return
	}
	defer rows.Close()

	var logs []models.ReadingLog
	for rows.Next() {
		var l models.ReadingLog
		if err := rows.Scan(&l.ID, &l.UserID, &l.BookName, &l.PagesRead, &l.TargetPages, &l.Reflection, &l.CreatedAt); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "scan failed"})
			return
		}
		logs = append(logs, l)
	}

	// Always return an array, even if empty
	if logs == nil {
		logs = []models.ReadingLog{}
	}

	c.JSON(http.StatusOK, logs)
}

// UpdateLog handles PUT /logs/:id
func UpdateLog(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid log id"})
		return
	}

	var req createLogRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	_, err = db.DB.Exec(`
		UPDATE reading_logs SET book_name=$1, pages_read=$2, target_pages=$3, reflection=$4
		WHERE id=$5 AND user_id=$6`,
		req.BookName, req.PagesRead, req.TargetPages, req.Reflection, id, req.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not update log"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "updated"})
}

// DeleteLog handles DELETE /logs/:id
func DeleteLog(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid log id"})
		return
	}

	// Get user_id from token or param, but for simplicity, assume user_id in body or use auth
	// For now, just delete by id (insecure, but for demo)
	_, err = db.DB.Exec(`DELETE FROM reading_logs WHERE id=$1`, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not delete log"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}
