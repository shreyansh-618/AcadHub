# Quick Start

## Prerequisites

- Node.js 18+
- MongoDB Atlas cluster
- Firebase project
- OpenAI API key

## Install

Windows:

```bash
setup.bat
```

macOS / Linux:

```bash
bash setup.sh
```

## Environment

Frontend `.env`:

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT
VITE_FIREBASE_STORAGE_BUCKET=YOUR_PROJECT.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
VITE_FIREBASE_APP_ID=YOUR_APP_ID
```

Backend `.env`:

```env
NODE_ENV=development
PORT=3000
DB_URI=mongodb+srv://user:password@cluster.mongodb.net/acadhub
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
VECTOR_SEARCH_INDEX_NAME=resource_embedding_index
CORS_ORIGIN=http://localhost:5173
FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
FIREBASE_PRIVATE_KEY=YOUR_PRIVATE_KEY
FIREBASE_CLIENT_EMAIL=YOUR_EMAIL@iam.gserviceaccount.com
JWT_SECRET=your-secret-key
```

Mobile `.env` / app config:

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
```

## Run

Frontend:

```bash
cd frontend
npm run dev
```

Backend:

```bash
cd backend
npm run dev
```

Mobile:

```bash
cd mobile-app
npm start
```

## Verify

Backend health:

```bash
curl http://localhost:3000/api/v1/health
```

Semantic search and Q&A now run directly inside the backend using OpenAI + MongoDB Atlas Vector Search.

## Atlas Vector Index

Create a vector index on `embeddings.embedding` with:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1536,
      "similarity": "cosine"
    }
  ]
}
```
