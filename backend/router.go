package main

import (
	"log"
	"os"
	"readingroom/handlers"
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

var googleOauthConfig = &oauth2.Config{
	ClientID:     os.Getenv("ClientID"),     // Set in env
	ClientSecret: os.Getenv("ClientSecret"), // Set in env
	RedirectURL:  os.Getenv("REDIRECT_URL"),
	Scopes:       []string{"https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"},
	Endpoint:     google.Endpoint,
}

func setupRouter(hub *Hub) *gin.Engine {
	r := gin.Default()

	// CORS middleware
	r.Use(cors.New(cors.Config{
		// Accept common local dev origins (including IPv6 loopback)
		AllowOriginFunc: func(origin string) bool {
			log.Printf("CORS: checking origin: %q", origin)
			if origin == "" {
				return false
			}
			// Allow common local development origins
			if strings.Contains(origin, "localhost") || strings.Contains(origin, "127.0.0.1") || strings.Contains(origin, "::1") {
				return true
			}
			// Some dev setups send Origin: "null" (e.g. file://, certain tools)
			if origin == "null" {
				return true
			}
			// In debug mode be permissive
			if gin.Mode() == gin.DebugMode {
				return true
			}
			return false
		},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Explicitly handle OPTIONS preflight for any path to avoid 403 from unmatched preflight
	r.OPTIONS("/*path", func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin != "" {
			c.Header("Access-Control-Allow-Origin", origin)
		}
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization")
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Status(204)
	})

	api := r.Group("/")
	{
		api.POST("/auth/register", handlers.Register)
		api.POST("/auth/login", handlers.Login)

		api.GET("/users/:id", handlers.GetProfile)
		api.PUT("/users/:id/profile", handlers.UpdateProfile)
		api.GET("/users/:id/reviews", handlers.GetUserReviews)

		api.POST("/logs", handlers.CreateLog)
		api.GET("/logs/:user_id", handlers.GetLogs)
		api.PUT("/logs/:id", handlers.UpdateLog)
		api.DELETE("/logs/:id", handlers.DeleteLog)

		api.GET("/notifications/:user_id", handlers.GetNotifications)
		api.POST("/notifications/preferences", handlers.SetNotificationPrefs)
		api.GET("/notifications/unsubscribe/:user_id", handlers.UnsubscribeNotifications)

		api.POST("/messages", handlers.CreateMessage)
		api.GET("/messages/:channel", handlers.GetMessages)

		api.GET("/books", handlers.GetBooks)
		api.POST("/books", handlers.CreateBook)
		api.GET("/books/:id/reviews", handlers.GetReviews)
		api.POST("/reviews", handlers.CreateReview)
	}

	r.GET("/auth/google/login", func(c *gin.Context) {
		url := googleOauthConfig.AuthCodeURL("state", oauth2.AccessTypeOffline)
		c.Redirect(302, url)
	})

	r.GET("/auth/google/callback", func(c *gin.Context) {
		code := c.Query("code")
		token, err := googleOauthConfig.Exchange(c, code)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to exchange code"})
			return
		}
		// Use token to get user info
		// For simplicity, create or login user
		c.JSON(200, gin.H{"token": token.AccessToken})
	})

	r.GET("/ws", func(c *gin.Context) {
		serveWs(hub, c)
	})

	return r
}
