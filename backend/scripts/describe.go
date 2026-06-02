package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	godotenv.Load()
	host := os.Getenv("DB_HOST")
	port := os.Getenv("DB_PORT")
	user := os.Getenv("DB_USER")
	pass := os.Getenv("DB_PASS")
	name := os.Getenv("DB_NAME")

	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=require", host, port, user, pass, name)
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	fmt.Println("--- Tables ---")
	rows, err := db.Query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
	if err != nil {
		log.Fatal(err)
	}
	for rows.Next() {
		var name string
		rows.Scan(&name)
		fmt.Println(name)
	}
	rows.Close()

	fmt.Println("\n--- Table Details ---")
	tables := []string{"users", "books", "reviews", "reading_logs", "messages"}
	for _, t := range tables {
		fmt.Printf("\nColumns for %s:\n", t)
		rows, err := db.Query(fmt.Sprintf("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '%s'", t))
		if err != nil {
			fmt.Printf("Error describing %s: %v\n", t, err)
			continue
		}
		for rows.Next() {
			var col, dtype string
			rows.Scan(&col, &dtype)
			fmt.Printf("  - %s (%s)\n", col, dtype)
		}
		rows.Close()
	}
}
