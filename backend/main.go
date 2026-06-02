package main

import (
	"log"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"readingroom/db"
	"readingroom/utils"
)

func main() {
	// Set Gin to Release Mode for silence
	gin.SetMode(gin.ReleaseMode)

	// Load .env file
	if err := godotenv.Load(); err != nil {
		// log.Println("No .env file found, using environment variables")
	}

	if err := db.ConnectDB(); err != nil {
		log.Fatalf("db connect failed: %v", err)
	}

	hub := NewHub()
	go hub.run()

	router := SetupRouter(hub)

	// Start notification scheduler
	scheduler := utils.NewNotificationScheduler()
	scheduler.Start()

	// Optional: simple reminder log (placeholder for scheduler/cron)
	go func() {
		for {
			time.Sleep(24 * time.Hour)
			log.Println("daily reminder tick")
		}
	}()

	start(router)
}

func start(r *gin.Engine) {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
