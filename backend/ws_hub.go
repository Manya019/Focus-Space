package main

import (
	"encoding/json"
	"log"
	"net/http"
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
	Channels    map[string]bool // channels this client is subscribed to
}

type Hub struct {
	clients      map[*Client]bool
	register     chan *Client
	unregister   chan *Client
	broadcast    chan []byte
	mu           sync.RWMutex // protects clients map
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
			log.Printf("hub: registered client user=%d username=%q", client.UserID, client.Username)
		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.Send)
			}
			h.mu.Unlock()
			log.Printf("hub: unregistered client user=%d username=%q", client.UserID, client.Username)
		case message := <-h.broadcast:
			// Parse message to get channel
			var wsMsg models.WSMessage
			if err := json.Unmarshal(message, &wsMsg); err != nil {
				log.Printf("Failed to parse message: %v", err)
				continue
			}

			// Update activity on chat or presence update
			if wsMsg.Type == "chat" || wsMsg.Type == "presence_update" {
				h.markActivity()
			}

			// Broadcast to clients subscribed to this channel
			h.mu.RLock()
			var clientsToSend []*Client
			for client := range h.clients {
				if client.Channels[wsMsg.Channel] {
					clientsToSend = append(clientsToSend, client)
				}
			}
			h.mu.RUnlock()

			// Send messages outside of lock
			for _, client := range clientsToSend {
				select {
				case client.Send <- message:
				default:
					h.mu.Lock()
					if _, ok := h.clients[client]; ok {
						delete(h.clients, client)
						close(client.Send)
					}
					h.mu.Unlock()
				}
			}
		}
	}
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func serveWs(hub *Hub, c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println("upgrade error:", err)
		return
	}

	log.Printf("ws: upgrade success from %s", conn.RemoteAddr())

	// Extract user info from JWT token
	userID := int64(0)
	username := ""
	email := ""

	token := c.Query("token")
	if token != "" {
		claims, err := utils.ParseToken(token)
		if err == nil {
			userID = claims.UserID
			// Fetch user details from DB
			var u models.User
			err := db.DB.QueryRow(`SELECT username, email FROM users WHERE id=$1`, userID).Scan(&u.Username, &u.Email)
			if err != nil {
				log.Printf("Failed to fetch user details for user %d: %v", userID, err)
			} else {
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

	// reader
	go func() {
		defer func() {
			hub.broadcastPresence()
			hub.unregister <- client
			client.Conn.Close()
		}()
		for {
			_, message, err := client.Conn.ReadMessage()
			if err != nil {
				log.Printf("ws read error for user=%d: %v", client.UserID, err)
				break
			}

			var wsMsg models.WSMessage
			if err := json.Unmarshal(message, &wsMsg); err != nil {
				log.Printf("Failed to parse client message: %v", err)
				continue
			}

			// Handle different message types
			switch wsMsg.Type {
			case "join":
				// Subscribe to channel
				client.Channels[wsMsg.Channel] = true
				hub.broadcastPresence()
			case "chat":
				// Add user info to message
				wsMsg.User = &models.WSUser{
					ID:       client.UserID,
					Username: client.Username,
					Email:    client.Email,
				}
				msgBytes, _ := json.Marshal(wsMsg)
				hub.broadcast <- msgBytes
			case "presence_update":
				// Update client's reading session info
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

	// writer
	go func() {
		for msg := range client.Send {
			if err := client.Conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				if websocket.IsCloseError(err) {
					log.Printf("ws write closed for user=%d: %v", client.UserID, err)
				} else {
					log.Printf("ws write error for user=%d: %v", client.UserID, err)
				}
				break
			}
		}
	}()
}

func (h *Hub) broadcastPresence() {
	// Get all clients in reading_room channel
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

	presenceMsg := models.WSMessage{
		Type:    "presence",
		Channel: "reading_room",
		Payload: presence,
	}

	msgBytes, _ := json.Marshal(presenceMsg)
	h.mu.RLock()
	for c := range h.clients {
		if c.Channels["reading_room"] {
			select {
			case c.Send <- msgBytes:
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

	// Count active users in reading_room
	userCount := 0
	for c := range h.clients {
		if c.Channels["reading_room"] {
			userCount++
		}
	}

	timeSinceActivity := time.Since(h.lastActivity)
	var newMood string

	if userCount == 0 {
		newMood = "idle"
	} else if timeSinceActivity < 60*time.Second {
		newMood = "active"
	} else {
		newMood = "calm"
	}

	if newMood != h.currentMood {
		h.currentMood = newMood
		// Broadcast mood change
		moodMsg := models.WSMessage{
			Type:    "mood",
			Channel: "reading_room",
			Payload: newMood,
		}
		msgBytes, _ := json.Marshal(moodMsg)

		// We can't use h.broadcast channel here because we're already holding the lock
		// and it might cause a deadlock if the run loop is waiting on the lock.
		// Instead, we'll send directly to clients.
		for c := range h.clients {
			if c.Channels["reading_room"] {
				select {
				case c.Send <- msgBytes:
				default:
				}
			}
		}
	}
}
