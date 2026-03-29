# Smart — AI-Powered Academic Intelligence Platform

Smart is a full-stack, multi-service academic platform designed to centralize fragmented academic workflows into a single intelligent system.

It enables students and educators to store, search, and interact with academic content using AI-powered semantic understanding, real-time collaboration, and cross-platform accessibility (web + mobile).

---

## Why This Exists

Academic content is fundamentally broken across institutions:

- Resources are scattered across WhatsApp groups, Google Drive, emails, and LMS portals
- Traditional search fails because it relies on exact keywords instead of meaning
- Discussions are disconnected from actual study material
- There is no unified system for managing academic workflows

Smart solves this by combining content storage, semantic search, collaboration, and AI processing into one platform.

---

## Key Capabilities

### Intelligent Resource Management

- Upload, organize, and retrieve academic content in a centralized system
- Metadata-driven storage with structured indexing

### Semantic Search (Core Feature)

- Meaning-based search using transformer models
- Retrieves relevant documents without exact keyword matches
- Powered by sentence embeddings and similarity scoring

### AI Document Intelligence

- Processes and analyzes academic documents via a dedicated AI service
- Enables contextual understanding of uploaded content

### Real-Time Collaboration

- Discussion threads and Q&A linked directly to resources
- WebSocket-based real-time updates using Socket.io

### Authentication & Access Control

- Firebase Authentication (Email/Password + Google Sign-In)
- Backend verification using Firebase Admin SDK
- Extensible role-based access system

### Cross-Platform Experience

- Responsive web application (React)
- Mobile application (React Native + Expo)
- Unified experience across devices

---

## System Architecture

```
Client Layer
 ├── Web (React + Vite)
 └── Mobile (React Native + Expo)

Backend Layer
 └── Node.js + Express API
     ├── Auth & User Management
     ├── Resource Management
     ├── Realtime Services (Socket.io)

AI Layer
 └── FastAPI Service
     ├── Embedding Generation (Sentence Transformers)
     └── Semantic Search Processing

Database Layer
 └── MongoDB (Mongoose ODM)
```

---

## Tech Stack

### Frontend

- React (Vite)
- Tailwind CSS
- Zustand
- React Router

### Backend

- Node.js
- Express.js
- MongoDB + Mongoose
- Socket.io
- Firebase Admin SDK

### AI Service

- FastAPI
- Sentence Transformers
- PyTorch

### Mobile

- React Native
- Expo
- Firebase Auth
- Zustand

---

## Repository Structure

```
smart/
├── frontend/        # React web client
├── backend/         # Express API server
├── ai-service/      # FastAPI AI microservice
├── mobile-app/      # React Native (Expo)
├── docker-compose.yml
└── QUICKSTART.md
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.9+
- MongoDB (Atlas recommended)
- Firebase Project

---

### Setup

#### 1. Clone Repository

```
git clone <repo-url>
cd smart
```

#### 2. Install Dependencies

```
# frontend
cd frontend && npm install

# mobile-app
cd mobile-app && npm install

# backend
cd ../backend && npm install

# AI service
cd ../ai-service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

---

#### 3. Environment Configuration

Create `.env` files using provided templates:

Frontend:

- VITE_API_URL
- VITE_AI_SERVICE_URL

Backend:

- MONGODB_URI
- JWT_SECRET
- Firebase credentials

AI Service:

- Model configs + API keys

Mobile:

- EXPO_PUBLIC_API_URL
- EXPO_PUBLIC_AI_SERVICE_URL

---

#### 4. Run Services

```
# frontend
npm run dev

# backend
npm run dev

# ai-service
python main.py

# mobile
npm start
```

---

## Local Development URLs

- Frontend → http://localhost:5173
- Backend → http://localhost:3000
- AI Service → http://localhost:8000

---

## Strengths of This Project

- Multi-service architecture
- AI-driven semantic search with real use-case
- Real-time communication using WebSockets
- Cross-platform system (web + mobile)
- Clean separation of concerns

---

## Current Limitations

- No vector database integration
- Limited scalability testing
- No caching layer (Redis/Dragonfly not implemented)
- Deployment pipeline not fully optimized

---

## Future Improvements

- Integrate vector database (FAISS / Pinecone / Weaviate)
- Add caching layer for performance optimization
- Improve semantic ranking quality
- Implement CI/CD pipeline
- Introduce role-based dashboards
