# To-Do Kanban Board

## Overview
A modern Kanban board with two modes:
- **Offline mode**: Uses localStorage for task storage (index.html + app.js)
- **Account mode**: Uses backend API with MongoDB for cloud persistence (login.html + board.html)

## Project Architecture

### Frontend (Static Files)
- `index.html` / `app.js` - Offline board with localStorage
- `login.html` - Login/register + Google Sign-In
- `board.html` / `app-backend.js` - Authenticated board using API
- `config.js` - API base URL configuration
- `styles.css` - Shared styles

### Backend (Node.js/Express)
- `backend/server.js` - Main Express server (serves both API and static files)
- `backend/routes/auth.js` - Authentication endpoints
- `backend/routes/tasks.js` - Task CRUD endpoints
- `backend/models/` - Mongoose models (User, Task)
- `backend/middleware/auth.js` - JWT authentication middleware

## Running the Project
The server runs on port 5000 and serves:
- Static frontend files from the root directory
- API endpoints under `/api/*`

## Environment Variables (Required for Account Mode)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `GOOGLE_CLIENT_ID` - Google OAuth client ID (optional, for Google Sign-In)

## API Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/google` - Google Sign-In
- `GET /api/tasks` - Get user's tasks (JWT required)
- `POST /api/tasks` - Create task (JWT required)
- `PUT /api/tasks/:id` - Update task (JWT required)
- `DELETE /api/tasks/:id` - Delete task (JWT required)
- `GET /api/health` - Health check

## Deployment
Uses autoscale deployment with `node backend/server.js` as the run command.
