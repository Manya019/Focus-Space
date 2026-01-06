# Backend Setup

## Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and fill in your actual credentials:
   - `DB_HOST` - Your database host
   - `DB_PORT` - Database port (default: 5432)
   - `DB_USER` - Database username
   - `DB_PASS` - Database password
   - `DB_NAME` - Database name
   - `JWT_SECRET` - Secret key for JWT tokens (use a strong random string in production)
   - `PORT` - Server port (default: 8080)
   - `GIN_MODE` - Gin mode: `debug` or `release`

## Running the Server

```bash
go run .
```

The server will automatically load environment variables from `.env` file.

## Database Setup

Make sure to run the schema first:
```bash
psql "your-connection-string" -f schema.sql
```

