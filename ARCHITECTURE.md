# Reading Room MVP

## System Flow
- Frontend (React) ↔ REST API (Gin) ↔ PostgreSQL
- WebSocket hub ↔ browser clients for presence + chat
- Optional scheduler tick emits daily reminder hook

```text
Browser (React)
   | REST /auth /users /logs /notifications
   v
Gin API (handlers) ---- PostgreSQL
   |
   +-- WebSocket /ws (hub)
```

### Lifecycles
- Join room: client opens `/ws` → hub registers → broadcast presence to others.
- Edit session draft: stored locally (`state/session.js`) until submitted.
- Submit log: REST `/logs` persists record → list refreshes.
- Chat: JSON `{type:"chat", body}` sent via WS → hub broadcasts → all chat boxes update.
- Profile update: PUT `/users/:id/profile` → profile view refresh.
- Notifications: POST `/notifications/preferences` → saved for future scheduler.

