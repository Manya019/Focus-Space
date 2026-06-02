package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"strings"

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

	schema, err := os.ReadFile("schema.sql")
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println("Running migrations...")
	
	// Execute the entire schema as one batch
	_, err = db.Exec(string(schema))
	if err != nil {
		// If it fails as a batch, try executing statement by statement
		fmt.Println("Batch execution failed, trying statement by statement...")
		statements := strings.Split(string(schema), ";")
		for _, stmt := range statements {
			stmt = strings.TrimSpace(stmt)
			if stmt == "" {
				continue
			}
			_, err := db.Exec(stmt)
			if err != nil {
				fmt.Printf("Error executing: %s\nError: %v\n", stmt, err)
			}
		}
	} else {
		fmt.Println("Migrations completed successfully!")
	}
}
