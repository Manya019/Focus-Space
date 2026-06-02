package handlers

import (
	"database/sql"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"readingroom/db"
	"readingroom/models"
)

type createBookRequest struct {
	Title       string `json:"title" binding:"required"`
	Author      string `json:"author" binding:"required"`
	Description string `json:"description"`
}

type createReviewRequest struct {
	BookID     int    `json:"book_id" binding:"required"`
	UserID     string `json:"user_id" binding:"required"`
	Rating     int    `json:"rating" binding:"required,min=1,max=5"`
	ReviewText string `json:"review_text" binding:"required"`
}

// GetBooks handles GET /books?q=query
func GetBooks(c *gin.Context) {
	search := strings.TrimSpace(c.Query("q"))
	query := `SELECT id, title, author, description, created_at FROM books`
	var rows *sql.Rows
	var err error

	if search != "" {
		query += ` WHERE title ILIKE $1 OR author ILIKE $2 ORDER BY created_at DESC`
		s := "%" + search + "%"
		rows, err = db.DB.Query(query, s, s)
	} else {
		query += ` ORDER BY created_at DESC`
		rows, err = db.DB.Query(query)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "query failed"})
		return
	}
	defer rows.Close()

	var books []models.Book
	for rows.Next() {
		var b models.Book
		if err := rows.Scan(&b.ID, &b.Title, &b.Author, &b.Description, &b.CreatedAt); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "scan failed"})
			return
		}
		books = append(books, b)
	}

	c.JSON(http.StatusOK, books)
}

// CreateBook handles POST /books
func CreateBook(c *gin.Context) {
	var req createBookRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var book models.Book
	err := db.DB.QueryRow(`
		INSERT INTO books (title, author, description, created_at)
		VALUES ($1, $2, $3, NOW()) RETURNING id, title, author, description, created_at`,
		req.Title, req.Author, req.Description,
	).Scan(&book.ID, &book.Title, &book.Author, &book.Description, &book.CreatedAt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create book"})
		return
	}

	c.JSON(http.StatusOK, book)
}

// GetReviews handles GET /books/:id/reviews
func GetReviews(c *gin.Context) {
	bookID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid book id"})
		return
	}

	query := `
		SELECT r.id, r.book_id, r.user_id, r.rating, r.review_text, r.created_at, u.username
		FROM reviews r
		JOIN users u ON r.user_id = u.id
		WHERE r.book_id = $1 ORDER BY r.created_at DESC`
	rows, err := db.DB.Query(query, bookID)
	if err != nil {
		log.Printf("GetReviews query failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "query failed"})
		return
	}
	defer rows.Close()

	var reviews []models.Review
	for rows.Next() {
		var r models.Review
		if err := rows.Scan(&r.ID, &r.BookID, &r.UserID, &r.Rating, &r.ReviewText, &r.CreatedAt, &r.Username); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "scan failed"})
			return
		}
		reviews = append(reviews, r)
	}

	c.JSON(http.StatusOK, reviews)
}

// GetUserReviews handles GET /users/:id/reviews
func GetUserReviews(c *gin.Context) {
	userID := c.Param("id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	q := "SELECT r.id, r.book_id, r.user_id, r.rating, r.review_text, r.created_at, b.title, b.author " +
		"FROM reviews r JOIN books b ON r.book_id = b.id " +
		"WHERE r.user_id = $1 ORDER BY r.created_at DESC"
	rows, err := db.DB.Query(q, userID)
	if err != nil {
		log.Printf("GetUserReviews query failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "query failed", "details": err.Error()})
		return
	}
	defer rows.Close()

	type UserReview struct {
		ID         int       `json:"id"`
		BookID     int       `json:"book_id"`
		UserID     string    `json:"user_id"`
		Rating     int       `json:"rating"`
		ReviewText string    `json:"review_text"`
		CreatedAt  time.Time `json:"created_at"`
		BookTitle  string    `json:"book_title"`
		BookAuthor string    `json:"book_author"`
	}

	var reviews []UserReview
	for rows.Next() {
		var r UserReview
		if err := rows.Scan(&r.ID, &r.BookID, &r.UserID, &r.Rating, &r.ReviewText, &r.CreatedAt, &r.BookTitle, &r.BookAuthor); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "scan failed"})
			return
		}
		reviews = append(reviews, r)
	}

	c.JSON(http.StatusOK, reviews)
}

// CreateReview handles POST /reviews
func CreateReview(c *gin.Context) {
	var req createReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Auto-sync user if not exists
	if err := ensureUser(req.UserID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "user sync failed", "details": err.Error()})
		return
	}

	var review models.Review
	err := db.DB.QueryRow(`
		INSERT INTO reviews (book_id, user_id, rating, review_text, created_at)
		VALUES ($1, $2, $3, $4, NOW()) RETURNING id, book_id, user_id, rating, review_text, created_at`,
		req.BookID, req.UserID, req.Rating, req.ReviewText,
	).Scan(&review.ID, &review.BookID, &review.UserID, &review.Rating, &review.ReviewText, &review.CreatedAt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create review"})
		return
	}

	// Get username
	err = db.DB.QueryRow(`SELECT username FROM users WHERE id = $1`, req.UserID).Scan(&review.Username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not get username"})
		return
	}

	c.JSON(http.StatusOK, review)
}
