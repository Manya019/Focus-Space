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
	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=require",
		os.Getenv("DB_HOST"), os.Getenv("DB_PORT"), os.Getenv("DB_USER"), os.Getenv("DB_PASS"), os.Getenv("DB_NAME"))
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// Check if books exist
	var count int
	db.QueryRow("SELECT COUNT(*) FROM books").Scan(&count)
	if count > 0 {
		fmt.Println("Books table already has data. Skipping seed.")
		return
	}

	fmt.Println("Seeding sample books...")
	books := []struct {
		Title  string
		Author string
		Desc   string
	}{
		{"The Great Gatsby", "F. Scott Fitzgerald", "A story of wealth, love, and the American Dream in the 1920s."},
		{"1984", "George Orwell", "A dystopian novel about totalitarianism and state surveillance."},
		{"To Kill a Mockingbird", "Harper Lee", "A powerful story of racial injustice and the loss of innocence."},
		{"The Hobbit", "J.R.R. Tolkien", "A fantasy adventure about a hobbit named Bilbo Baggins."},
	}

	for _, b := range books {
		_, err := db.Exec("INSERT INTO books (title, author, description) VALUES ($1, $2, $3)", b.Title, b.Author, b.Desc)
		if err != nil {
			fmt.Printf("Error seeding %s: %v\n", b.Title, err)
		}
	}
	fmt.Println("Seeding completed!")
}
