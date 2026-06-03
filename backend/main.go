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

	hub := NewHub()
	go hub.run()

	router := SetupRouter(hub)

	// Try to connect to DB asynchronously with timeout
	// Don't block server startup on DB connection
	go func() {
		if err := db.ConnectDB(); err != nil {
			log.Printf("WARNING: db connect failed on startup: %v. Some features will be unavailable.", err)
		}
	}()

	// Start notification scheduler with delay to allow DB connection
	// This gives the async DB connection time to complete before scheduler runs
	go func() {
		time.Sleep(5 * time.Second) // Wait for DB to potentially connect
		scheduler := utils.NewNotificationScheduler()
		scheduler.Start()
		log.Println("[Scheduler] Notification scheduler started")
	}()

	// Optional: simple reminder log (placeholder for scheduler/cron)
	go func() {
		for {
			time.Sleep(24 * time.Hour)
			log.Println("daily reminder tick")
		}
	}()

	log.Println("Starting server...")
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
