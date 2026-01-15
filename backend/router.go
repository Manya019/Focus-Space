package main

import (
	"os"
	"readingroom/handlers"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

var googleOauthConfig = &oauth2.Config{
	ClientID:     os.Getenv("ClientID"),
	ClientSecret: os.Getenv("ClientSecret"),
	RedirectURL:  os.Getenv("REDIRECT_URL"),
	Scopes: []string{
		"https://www.googleapis.com/auth/userinfo.email",
		"https://www.googleapis.com/auth/userinfo.profile",
	},
	Endpoint: google.Endpoint,
}

func SetupRouter(hub *Hub) *gin.Engine {
	r := gin.Default()

	frontendURL := os.Getenv("FRONTEND_URL")

	origins := []string{
		"http://localhost:5173",
	}

	if frontendURL != "" {
		origins = append(origins, frontendURL)
	}

	r.Use(cors.New(cors.Config{
		AllowOrigins:     origins,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

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
		api.DELETE("/messages/:id", handlers.DeleteMessage)

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
		c.JSON(200, gin.H{"token": token.AccessToken})
	})

	r.GET("/ws", func(c *gin.Context) {
		serveWs(hub, c)
	})

	return r
}
