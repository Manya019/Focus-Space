package handlers

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"

	"readingroom/db"
	"readingroom/models"
)

type profileUpdateRequest struct {
	Username  string `json:"username"`
	Genre     string `json:"genre"`
	About     string `json:"about"`
	Likes     string `json:"likes"`
	AvatarURL string `json:"avatar_url"`
}

// GetProfile handles GET /users/:id
func GetProfile(c *gin.Context) {
	idParam := c.Param("id")
	var user models.User
	err := db.DB.QueryRow(`
		SELECT id, username, email, genre, about, likes, avatar_url, created_at
		FROM users WHERE id=$1`, idParam).
		Scan(&user.ID, &user.Username, &user.Email, &user.Genre, &user.About, &user.Likes, &user.AvatarURL, &user.CreatedAt)

	if err == sql.ErrNoRows {
		// Auto-create user if not found (since we trust Clerk)
		_, err = db.DB.Exec(`
			INSERT INTO users (id, username, email, password_hash, avatar_url, created_at)
			VALUES ($1, $2, $3, '', '', NOW())`, idParam, "New User", idParam+"@clerk.user")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "could not auto-create user"})
			return
		}
		// Try fetching again
		err = db.DB.QueryRow(`
			SELECT id, username, email, genre, about, likes, avatar_url, created_at
			FROM users WHERE id=$1`, idParam).
			Scan(&user.ID, &user.Username, &user.Email, &user.Genre, &user.About, &user.Likes, &user.AvatarURL, &user.CreatedAt)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "query failed"})
		return
	}

	c.JSON(http.StatusOK, user)
}

// UpdateProfile handles PUT /users/:id/profile
func UpdateProfile(c *gin.Context) {
	idParam := c.Param("id")
	
	var req profileUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	_, err := db.DB.Exec(`
		UPDATE users SET username=$1, genre=$2, about=$3, likes=$4, avatar_url=$5 WHERE id=$6`,
		req.Username, req.Genre, req.About, req.Likes, req.AvatarURL, idParam)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "update failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "updated"})
}
