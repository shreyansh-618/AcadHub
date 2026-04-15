# Smart

Smart is an academic resource platform with:
- React web frontend
- React Native mobile app
- Node.js + Express backend
- MongoDB Atlas storage and vector search
- OpenAI-powered RAG for semantic search and document-grounded Q&A

## Architecture

Client Layer
- Web: React + Vite
- Mobile: React Native + Expo

Backend Layer
- Express API
- Firebase-backed authentication
- Resource storage via MongoDB GridFS
- OpenAI embeddings + chat completions
- MongoDB Atlas Vector Search

Database Layer
- MongoDB Atlas
- Mongoose ODM

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
- MongoDB Atlas
- Firebase project
- OpenAI API key

Install:

```bash
cd frontend && npm install
cd ../backend && npm install
cd ../mobile-app && npm install
```

Configure environment files:

Frontend:
- `VITE_API_BASE_URL`
- Firebase public keys

Backend:
- `DB_URI`
- `OPENAI_API_KEY`
- `VECTOR_SEARCH_INDEX_NAME`
- Firebase server credentials
- `CORS_ORIGIN`

Mobile:
- `EXPO_PUBLIC_API_BASE_URL`
- Firebase public keys

Run locally:

```bash
cd frontend && npm run dev
cd backend && npm run dev
cd mobile-app && npm start
```

Local URLs:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000/api/v1`

## RAG Flow

```text
User Query
  -> OpenAI Embedding
  -> MongoDB Atlas Vector Search
  -> OpenAI Answer Generation
```

Document uploads are chunked in the backend, embedded with OpenAI, and stored in MongoDB for retrieval.

## Required Atlas Vector Index

Create a vector index on the `embeddings` collection using the `embedding` field with `1536` dimensions and `cosine` similarity. The default index name in code is `resource_embedding_index`.

## Notes

- The old Python AI microservice has been retired.
- The backend now owns semantic search, indexing, summaries, and Q&A.
