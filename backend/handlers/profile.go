package handlers

import (
	"database/sql"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"readingroom/db"
	"readingroom/models"
)

type profileUpdateRequest struct {
	Username string `json:"username"`
	Genre    string `json:"genre"`
	About    string `json:"about"`
	Likes    string `json:"likes"`
}

// GetProfile handles GET /users/:id
func GetProfile(c *gin.Context) {
	idParam := c.Param("id")
	var user models.User
	err := db.DB.QueryRow(`
		SELECT id, username, email, genre, about, likes, created_at
		FROM users WHERE id=$1`, idParam).
		Scan(&user.ID, &user.Username, &user.Email, &user.Genre, &user.About, &user.Likes, &user.CreatedAt)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
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
	userID, err := strconv.ParseInt(idParam, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	var req profileUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	_, err = db.DB.Exec(`
		UPDATE users SET username=$1, genre=$2, about=$3, likes=$4 WHERE id=$5`,
		req.Username, req.Genre, req.About, req.Likes, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "update failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "updated"})
}
