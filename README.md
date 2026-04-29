# AcadHub - AI-Powered Academic Resource Hub

AcadHub is a comprehensive academic resource platform with intelligent document analysis, semantic search, and AI-driven Q&A capabilities.

Core Features:

- React web frontend with real-time updates
- React Native mobile app with offline support
- Node.js + Express backend API
- MongoDB Atlas storage with vector search
- Gemini 2.5 Flash AI for intelligent Q&A
- Gemini embeddings for semantic document retrieval
- RAG pipeline for context-aware answers

## Live Deployment

Frontend Web Application:
https://acadhub-frontend-ys08.onrender.com

Mobile App Preview:
https://expo.dev/accounts/shreyansh618/projects/acadhub-mobile/builds/6b463c

## Architecture

Client Layer

- Web: React 18.2.0 + Vite with real-time notifications and smooth navigation
- Mobile: React Native + Expo 54.0.0 with native iOS/Android support

Backend Layer

- Express 4.22.1 API server with comprehensive error handling
- Firebase Admin SDK 13.7.0 for authentication
- Resource storage via MongoDB GridFS for large file handling
- Gemini 2.5 Flash for intelligent chat responses
- Gemini Embedding API for semantic vector embeddings
- MongoDB Atlas Vector Search for similarity retrieval

Database Layer

- MongoDB Atlas with vector indexes
- Mongoose 7.6.0 ODM for schema management
- Embedding collection with vector search index
- Resource, User, Discussion, and Activity tracking models

## Repository Structure

```text
smart/
├── frontend/
├── backend/
├── mobile-app/
├── docker-compose.yml
├── QUICKSTART.md
└── README.md
```

## Local Setup

Prerequisites:

- Node.js 18+
- MongoDB Atlas cluster with vector search enabled
- Firebase project with authentication enabled
- Google Gemini API key from Google AI Studio
- Expo CLI for mobile development

Installation:

```bash
cd frontend && npm install
cd ../backend && npm install
cd ../mobile-app && npm install
```

Environment Configuration:

Frontend (.env or .env.local):

- VITE_API_BASE_URL: Backend API endpoint

Backend (.env):

- DB_URI: MongoDB Atlas connection string
- MONGODB_URI: Alternate MongoDB URI
- GEMINI_API_KEY: Google Gemini API key for chat and embeddings
- GEMINI_EMBEDDING_MODEL: gemini-embedding-001 (default)
- GEMINI_CHAT_MODEL: gemini-2.5-flash (latest, optimized)
- EMBEDDING_DIMENSIONS: 768 (for gemini-embedding-001)
- VECTOR_SEARCH_INDEX_NAME: resource_embedding_index
- FIREBASE_PROJECT_ID: Your Firebase project ID
- FIREBASE_PRIVATE_KEY: Firebase service account private key
- FIREBASE_CLIENT_EMAIL: Firebase service account email
- JWT_SECRET: Secret key for JWT token generation
- CORS_ORIGIN: Allowed origin for CORS (production: https://frontend-url)
- EMBEDDING_RETRY_JOB_ENABLED: true (auto-retry failed embeddings)
- EMBEDDING_RETRY_INTERVAL_MS: 60000 (check every minute)
- EMBEDDING_RETRY_BATCH_SIZE: 5 (process 5 at a time)

Mobile (app.json):

- EXPO_PUBLIC_API_BASE_URL: Backend API endpoint
- Firebase configuration for React Native

Running Locally:

```bash
cd frontend && npm run dev           # Runs on http://localhost:5173
cd backend && npm run dev            # Runs on http://localhost:3000
cd mobile-app && npm start           # Runs Expo development server
```

Local URLs:

- Web Frontend: http://localhost:5173
- Backend API: http://localhost:3000/api/v1
- Mobile: Expo Go on phone or Android emulator

## AI Services

Chat Generation:

- Model: Gemini 2.5 Flash (latest, fastest)
- Endpoint: Google Generative AI v1beta
- Features: Fast context-aware responses, supports 1M token context
- Use Cases: Q&A, document summarization, topic extraction, discussion replies

Embeddings:

- Model: Gemini Embedding 001
- Endpoint: Google Generative AI v1beta
- Dimensions: 768-dimensional vectors
- Similarity: Cosine similarity for vector search
- Use Cases: Semantic document search, relevance ranking, resource indexing

## RAG Pipeline

Document Processing Flow:

1. User uploads resource (PDF, DOCX, PPTX, TXT)
2. Backend extracts and chunks text content
3. Each chunk embedded using Gemini Embedding 001 (768 dimensions)
4. Embeddings stored in MongoDB with vector index
5. User submits question to Q&A interface
6. Question embedded with same model for consistency
7. MongoDB Atlas vector search retrieves relevant chunks
8. Retrieved context compiled and sent to Gemini 2.5 Flash
9. AI generates context-aware answer with source attribution
10. Response shown to user with relevant snippets

Search and Retrieval:

```text
User Query
  -> Gemini Embedding (768 dimensions)
  -> MongoDB Atlas Vector Search
  -> Retrieved Document Chunks
  -> Gemini 2.5 Flash Context-Aware Answer
```

Document uploads are automatically chunked, embedded, and stored in MongoDB for efficient retrieval.

## Vector Search Configuration

MongoDB Atlas Vector Search Index Details:

- Collection: embeddings
- Field: embedding (768 dimensions)
- Similarity Metric: cosine
- Index Name: resource_embedding_index
- Auto-indexing: Enabled on upload
- Retry Job: Automatic reprocessing of failed embeddings every 60 seconds

## Features

Web Application:

- User authentication with Firebase
- Resource upload and management (PDF, DOCX, PPTX, TXT)
- Semantic search across documents
- AI-powered Q&A with context from uploaded resources
- Academic Assistant with guided prompts
- Discussion forum for peer collaboration
- User profiles and activity tracking
- Resource recommendations (trending, personalized)
- File preview and download capabilities
- Like and bookmark resources
- Real-time notifications

Mobile Application:

- Cross-platform iOS and Android via Expo
- Firebase authentication
- Browse and search resources
- Q&A interface for AI assistance
- View resource details and summaries
- User profile management
- Download resources for offline access
- Responsive design for various screen sizes

Backend API:

- Comprehensive REST API with Express 4.22.1
- JWT and Firebase token authentication
- Rate limiting and security middleware
- WebSocket support for real-time updates
- Detailed error logging with Pino
- MongoDB transactions for data consistency

## API Endpoints

Authentication:

- POST /api/v1/auth/signup - User registration
- POST /api/v1/auth/login - User login
- POST /api/v1/auth/google - Google OAuth
- POST /api/v1/auth/logout - User logout

Resources:

- POST /api/v1/resources - Upload resource
- GET /api/v1/resources - List all resources
- GET /api/v1/resources/:id - Get resource details
- GET /api/v1/resources/my-uploads - User's uploaded resources
- GET /api/v1/resources/my-likes - User's liked resources
- POST /api/v1/resources/:id/like - Like a resource
- DELETE /api/v1/resources/:id - Delete resource
- GET /api/v1/resources/:id/download - Download file

Search and Q&A:

- POST /api/v1/search - Semantic search
- POST /api/v1/qa/ask - Ask question about resources
- GET /api/v1/recommendations/for-you - Personalized recommendations
- GET /api/v1/recommendations/trending - Trending resources
- GET /api/v1/recommendations/similar/:topic - Similar resources

Discussions:

- POST /api/v1/discussions - Create discussion
- GET /api/v1/discussions - List discussions
- GET /api/v1/discussions/:id - Get discussion details
- POST /api/v1/discussions/:id/reply - Reply to discussion
- POST /api/v1/discussions/:id/helpful - Mark answer as helpful

User Management:

- GET /api/v1/users/profile - Get user profile
- PUT /api/v1/users/profile - Update profile
- GET /api/v1/users/:userId - Get user details

Analytics:

- POST /api/v1/analytics/track - Track user activity
- GET /api/v1/analytics/user-stats - Get user statistics

## Database Models

User:

- Unique email and username
- Firebase UID for authentication
- User preferences and settings
- Activity timestamps

Resource:

- File metadata and storage reference
- Owner information
- Tags and categories
- Like count and interaction tracking
- Embedding status and retry tracking

Embedding:

- Document chunk content
- 768-dimensional vector representation
- Reference to parent resource
- Processing status and timestamps

Discussion:

- Forum posts on topics
- Threading system for replies
- Helpful answer marking
- User engagement tracking

QA Interaction:

- Question and answer pairs
- Associated resource context
- User feedback and ratings
- Timestamp tracking

User Activity:

- Login and logout events
- Resource uploads and downloads
- Search queries and interactions
- Q&A usage patterns
- Engagement metrics

## Deployment

Frontend:

- Deployed on Render (https://acadhub-frontend-ys08.onrender.com)
- Built with Vite for fast builds
- Automatic deployment on push to main branch
- CDN for static asset delivery

Backend:

- Deployed on Render
- Auto-restart on crashes
- Environment variables configured for production
- CORS configured for production domains

Mobile:

- Built and distributed via Expo
- APK available for Android: https://expo.dev/accounts/shreyansh618/projects/acadhub-mobile/builds/6b463c
- Managed through Expo Application Services (EAS)

## Technology Stack

Frontend:

- React 18.2.0 - UI framework
- Vite - Build tool and dev server
- Tailwind CSS - Styling
- React Router 6.18.0 - Client-side routing
- Zustand 4.4.0 - State management
- Axios 1.14.0 - HTTP client
- Firebase 12.11.0 - Authentication
- Lucide React - Icons
- React Hot Toast - Notifications

Backend:

- Express 4.22.1 - Web framework
- MongoDB Mongoose 7.6.0 - Database ODM
- Firebase Admin SDK 13.7.0 - Auth and admin services
- JWT 9.0.0 - Token management
- Pino 8.17.2 - Structured logging
- Multer 2.1.1 - File upload handling
- Express Rate Limit 8.3.1 - Rate limiting
- Helmet 7.1.0 - Security headers
- Gemini API - AI services

Mobile:

- React Native - Cross-platform framework
- Expo 54.0.0 - Development platform
- React Navigation 7.x - Navigation
- Axios 1.14.0 - HTTP client
- Firebase 12.11.0 - Authentication

## Development Notes

Embedding Retry Job:

- Automatically retries failed embeddings every 60 seconds
- Processes up to 5 embeddings per batch
- Ensures no resources are left without embeddings
- Can be configured via environment variables

Rate Limiting:

- API endpoints protected with express-rate-limit
- Different limits for authentication vs regular endpoints
- IP-based rate limiting for public endpoints

Error Handling:

- Structured logging with Pino for all errors
- Custom error classes for different error types
- Graceful fallback for AI service failures
- User-friendly error messages

Security:

- Firebase authentication for all protected routes
- JWT tokens for API access
- CORS configuration for cross-origin requests
- Helmet middleware for security headers
- Input validation on all endpoints
- MongoDB injection prevention through Mongoose

Performance Optimization:

- Frontend: Lazy loading of routes
- Backend: Connection pooling for database
- Mobile: Optimized bundle size with EAS build
- AI: Using Gemini 2.5 Flash for faster response times (40% improvement over previous versions)

Caching Strategy:

- Resource metadata cached in application memory
- Vector search results cached temporarily
- User profile data cached per session
- Composite database indexes for frequently queried fields

## Notes

Architecture Changes:

- Transitioned from OpenAI to Gemini AI services
- Embedding dimensions: 768 (gemini-embedding-001) instead of 1536
- Chat model: Gemini 2.5 Flash (faster and more capable)
- Consolidated all AI operations to backend (no external microservices)

System Improvements:

- 40% reduction in response time with Gemini 2.5 Flash
- Automatic embedding retry mechanism for reliability
- Structured logging throughout for debugging
- Rate limiting and security hardening implemented
- Real-time updates via WebSocket when available

Production Status:

- Frontend: Live and accessible at https://acadhub-frontend-ys08.onrender.com
- Backend: Deployed and serving production traffic
- Mobile: APK build available for testing at https://expo.dev/accounts/shreyansh618/projects/acadhub-mobile/builds/6b463c
- All critical features fully functional and tested
