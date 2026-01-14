package handlers

import (
	"database/sql"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"

	"readingroom/db"
	"readingroom/models"
	"readingroom/utils"
)

type registerRequest struct {
	Username string `json:"username" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

type loginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// Register handles POST /auth/register
func Register(c *gin.Context) {
	var req registerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("Register validation error: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	log.Printf("Register attempt for email: %s, username: %s", req.Email, req.Username)

	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("Password hash error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
		return
	}

	if db.DB == nil {
		log.Printf("Database connection is nil!")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database not connected"})
		return
	}

	var id int64
	err = db.DB.QueryRow(`
		INSERT INTO users (username, email, password_hash, genre, about, likes, created_at)
		VALUES ($1, $2, $3, '', '', '', NOW()) RETURNING id`,
		req.Username, strings.ToLower(req.Email), string(hashed),
	).Scan(&id)
	if err != nil {
		log.Printf("Register database error: %v (type: %T)", err, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create user", "details": err.Error()})
		return
	}

	log.Printf("User registered successfully with ID: %d", id)

	token, err := utils.GenerateToken(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not sign token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token":    token,
		"user_id":  id,
		"username": req.Username,
		"email":    strings.ToLower(req.Email),
		"genre":    "",
		"about":    "",
		"likes":    "",
	})
}

// Login handles POST /auth/login
func Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	err := db.DB.QueryRow(`
		SELECT id, username, email, password_hash FROM users WHERE email=$1`,
		strings.ToLower(req.Email),
	).Scan(&user.ID, &user.Username, &user.Email, &user.PasswordHash)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "query failed"})
		return
	}

	if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)) != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	token, err := utils.GenerateToken(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not sign token"})
		return
	}

	// Fetch additional profile data
	var profile models.User
	err = db.DB.QueryRow(`
		SELECT id, username, email, genre, about, likes, created_at
		FROM users WHERE id=$1`, user.ID).
		Scan(&profile.ID, &profile.Username, &profile.Email, &profile.Genre, &profile.About, &profile.Likes, &profile.CreatedAt)
	if err != nil {
		log.Printf("Failed to fetch profile for user %d: %v", user.ID, err)
		// Continue with basic data if profile fetch fails
		c.JSON(http.StatusOK, gin.H{
			"token":    token,
			"user_id":  user.ID,
			"username": user.Username,
			"email":    user.Email,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token":    token,
		"user_id":  profile.ID,
		"username": profile.Username,
		"email":    profile.Email,
		"genre":    profile.Genre,
		"about":    profile.About,
		"likes":    profile.Likes,
	})
}
