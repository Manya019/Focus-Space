# Reading Room

**A real-time reading room application where users can read together, track progress, and communicate live.**

---

## Overview

Reading Room provides a single shared space where users can:

- View active readers  
- Track personal reading progress  
- Participate in real-time discussions  
- Maintain a history of completed reading sessions  

---

## Features

- **Live Reading Room** – Real-time presence and progress tracking  
- **Live Chat** – Reading room chat and general discussion channel  
- **Reading Logs** – Session-based progress and notes stored on completion  
- **Focus Mode** – Pomodoro-inspired ambient background (client-side only)  
- **User Profiles** – Reading interests and history  
- **Book Search** – Book metadata integration  

---

## Tech Stack

- **Frontend:** React  
- **Backend:** Go  
- **Real-Time:** WebSockets  
- **Database:** PostgreSQL  

---

## Architecture

- WebSockets handle chat, presence, and progress updates  
- REST APIs handle profiles and reading logs  
- Ambient focus mode is implemented per user on the client  

---

## Out of Scope

- Multiple rooms  
- Direct messages  
- Video/audio streaming  

---

## Run Locally

```bash
go run main.go
npm install && npm run dev
