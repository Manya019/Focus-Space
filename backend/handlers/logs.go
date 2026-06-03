package handlers

import (
	"database/sql"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"

	"readingroom/db"
	"readingroom/models"
)

type createLogRequest struct {
	UserID      string `json:"user_id" binding:"required"`
	BookName    string `json:"book_name" binding:"required"`
	PagesRead   int    `json:"pages_read" binding:"required"`
	TargetPages     int    `json:"target_pages"`
	Reflection      string `json:"reflection"`
	DurationMinutes int    `json:"duration_minutes"`
}

// CreateLog handles POST /logs
func CreateLog(c *gin.Context) {
	var req createLogRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Auto-sync user if not exists
	if err := ensureUser(req.UserID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "user sync failed", "details": err.Error()})
		return
	}

	_, err := db.DB.Exec(`
		INSERT INTO reading_logs (user_id, book_name, pages_read, target_pages, reflection, duration_minutes, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
		req.UserID, req.BookName, req.PagesRead, req.TargetPages, req.Reflection, req.DurationMinutes)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not save log", "details": err.Error()})
		return
	}

	// Calculate XP: 100 XP per 10 mins + 10 XP per page
	xpEarned := (req.DurationMinutes / 10 * 100) + (req.PagesRead * 10)
	if xpEarned < 50 {
		xpEarned = 50
	} // Minimum XP for logging

	// Update User XP, Level, and Streak
	_, err = db.DB.Exec(`
		UPDATE users 
		SET xp = xp + $1,
		    level = 1 + (xp + $1) / 1000,
		    streak = CASE 
		        WHEN last_activity IS NULL OR last_activity < NOW() - INTERVAL '48 hours' THEN 1
		        WHEN last_activity < NOW() - INTERVAL '24 hours' THEN streak + 1
		        ELSE streak
		    END,
		    last_activity = NOW()
		WHERE id = $2`, xpEarned, req.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not update user stats", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "logged",
		"xp_earned": xpEarned,
	})
}

// GetLogs handles GET /logs/:user_id
func GetLogs(c *gin.Context) {
	uid := c.Param("user_id")
	// log.Printf("DEBUG: GetLogs received user_id: [%s]", uid)
	if uid == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	rows, err := db.DB.Query(`
		SELECT id,
		       user_id,
		       book_name,
		       pages_read,
		       COALESCE(target_pages, 0),
		       COALESCE(reflection, ''),
		       created_at
		FROM reading_logs WHERE user_id=$1 ORDER BY created_at DESC`, uid)
	if err != nil {
		log.Printf("GetLogs query failed for user %s: %v", uid, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "query failed", "details": err.Error()})
		return
	}
	defer rows.Close()

	var logs []models.ReadingLog
	for rows.Next() {
		var l models.ReadingLog
		var pagesRead sql.NullInt64
		var targetPages int
		if err := rows.Scan(&l.ID, &l.UserID, &l.BookName, &pagesRead, &targetPages, &l.Reflection, &l.CreatedAt); err != nil {
			log.Printf("GetLogs scan failed for user %s: %v", uid, err)
			// Skip corrupted rows instead of failing entire request
			log.Printf("Skipping corrupted row for user %s", uid)
			continue
		}
		// Handle NULL pages_read
		if pagesRead.Valid {
			l.PagesRead = int(pagesRead.Int64)
		}
		l.TargetPages = targetPages
		logs = append(logs, l)
	}

	if err := rows.Err(); err != nil {
		log.Printf("GetLogs rows failed for user %s: %v", uid, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "rows failed", "details": err.Error()})
		return
	}

	if logs == nil {
		logs = []models.ReadingLog{}
	}

	c.JSON(http.StatusOK, logs)
}

// UpdateLog handles PUT /logs/:id
func UpdateLog(c *gin.Context) {
	// Log ID is still int64
	var req createLogRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	id := c.Param("id")

	_, err := db.DB.Exec(`
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
	id := c.Param("id")

	_, err := db.DB.Exec(`DELETE FROM reading_logs WHERE id=$1`, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not delete log"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}
