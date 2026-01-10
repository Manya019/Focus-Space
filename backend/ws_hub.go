package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"

	"readingroom/db"
	"readingroom/models"
	"readingroom/utils"
)

type Client struct {
	Conn        *websocket.Conn
	Send        chan []byte
	UserID      int64
	Username    string
	Email       string
	Book        string
	TargetPages int
	Channels    map[string]bool
}

type Hub struct {
	clients      map[*Client]bool
	register     chan *Client
	unregister   chan *Client
	broadcast    chan []byte
	mu           sync.RWMutex
	currentMood  string
	lastActivity time.Time
}

func newHub() *Hub {
	return &Hub{
		clients:      make(map[*Client]bool),
		register:     make(chan *Client),
		unregister:   make(chan *Client),
		broadcast:    make(chan []byte),
		currentMood:  "idle",
		lastActivity: time.Now(),
	}
}

   //Hub loop
   

func (h *Hub) run() {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			h.updateMood()

		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			h.markActivity()
			log.Printf("hub: registered user=%d username=%q", client.UserID, client.Username)

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.Send)
			}
			h.mu.Unlock()
			log.Printf("hub: unregistered user=%d username=%q", client.UserID, client.Username)

		case message := <-h.broadcast:
			var wsMsg models.WSMessage
			if err := json.Unmarshal(message, &wsMsg); err != nil {
				log.Printf("ws: invalid message: %v", err)
				continue
			}

			if wsMsg.Type == "chat" || wsMsg.Type == "presence_update" {
				h.markActivity()
			}

			h.mu.RLock()
			var targets []*Client
			for c := range h.clients {
				if c.Channels[wsMsg.Channel] {
					targets = append(targets, c)
				}
			}
			h.mu.RUnlock()

			for _, c := range targets {
				select {
				case c.Send <- message:
				default:
					h.mu.Lock()
					delete(h.clients, c)
					close(c.Send)
					h.mu.Unlock()
				}
			}
		}
	}
}

   //WebSocket upgrader
   

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		frontend := os.Getenv("FRONTEND_URL")

		return origin == "http://localhost:5173" ||
			(frontend != "" && origin == frontend)
	},
}

   //WebSocket handler

func serveWs(hub *Hub, c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println("ws upgrade error:", err)
		return
	}

	userID := int64(0)
	username := ""
	email := ""

	token := c.Query("token")
	if token != "" {
		claims, err := utils.ParseToken(token)
		if err == nil {
			userID = claims.UserID
			var u models.User
			err := db.DB.
				QueryRow(`SELECT username, email FROM users WHERE id=$1`, userID).
				Scan(&u.Username, &u.Email)
			if err == nil {
				username = u.Username
				email = u.Email
			}
		}
	}

	client := &Client{
		Conn:     conn,
		Send:     make(chan []byte, 256),
		UserID:   userID,
		Username: username,
		Email:    email,
		Channels: make(map[string]bool),
	}

	hub.register <- client


	go func() {
		defer func() {
			hub.broadcastPresence()
			hub.unregister <- client
			client.Conn.Close()
		}()

		for {
			_, message, err := client.Conn.ReadMessage()
			if err != nil {
				break
			}

			var wsMsg models.WSMessage
			if err := json.Unmarshal(message, &wsMsg); err != nil {
				continue
			}

			switch wsMsg.Type {
			case "join":
				client.Channels[wsMsg.Channel] = true
				hub.broadcastPresence()

			case "chat":
				wsMsg.User = &models.WSUser{
					ID:       client.UserID,
					Username: client.Username,
					Email:    client.Email,
				}
				msg, _ := json.Marshal(wsMsg)
				hub.broadcast <- msg

			case "presence_update":
				if payload, ok := wsMsg.Payload.(map[string]interface{}); ok {
					if book, ok := payload["book"].(string); ok {
						client.Book = book
					}
					if pages, ok := payload["target_pages"].(float64); ok {
						client.TargetPages = int(pages)
					}
				}
				hub.broadcastPresence()
			}
		}
	}()

	go func() {
		for msg := range client.Send {
			if err := client.Conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				break
			}
		}
	}()
}


func (h *Hub) broadcastPresence() {
	h.mu.RLock()
	var presence []models.WSUser
	for c := range h.clients {
		if c.Channels["reading_room"] && c.UserID > 0 {
			presence = append(presence, models.WSUser{
				ID:          c.UserID,
				Username:    c.Username,
				Email:       c.Email,
				Book:        c.Book,
				TargetPages: c.TargetPages,
			})
		}
	}
	h.mu.RUnlock()

	msg, _ := json.Marshal(models.WSMessage{
		Type:    "presence",
		Channel: "reading_room",
		Payload: presence,
	})

	h.mu.RLock()
	for c := range h.clients {
		if c.Channels["reading_room"] {
			select {
			case c.Send <- msg:
			default:
			}
		}
	}
	h.mu.RUnlock()
}

func (h *Hub) markActivity() {
	h.mu.Lock()
	h.lastActivity = time.Now()
	h.mu.Unlock()
	h.updateMood()
}

func (h *Hub) updateMood() {
	h.mu.Lock()
	defer h.mu.Unlock()

	count := 0
	for c := range h.clients {
		if c.Channels["reading_room"] {
			count++
		}
	}

	var mood string
	switch {
	case count == 0:
		mood = "idle"
	case time.Since(h.lastActivity) < 60*time.Second:
		mood = "active"
	default:
		mood = "calm"
	}

	if mood != h.currentMood {
		h.currentMood = mood
		msg, _ := json.Marshal(models.WSMessage{
			Type:    "mood",
			Channel: "reading_room",
			Payload: mood,
		})

		for c := range h.clients {
			if c.Channels["reading_room"] {
				select {
				case c.Send <- msg:
				default:
				}
			}
		}
	}
}
