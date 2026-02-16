# Quick Start Guide

Get the Academic Platform up and running in 5 minutes!

## Prerequisites

- Node.js 18+ ([Download](https://nodejs.org/))
- Python 3.9+ ([Download](https://www.python.org/))
- MongoDB Atlas account ([Sign up](https://www.mongodb.com/cloud/atlas))
- Firebase project ([Create](https://console.firebase.google.com/))

## Installation

### 1. Clone/Setup Repository

```bash
cd /path/to/smart
```

### 2. Run Setup Script

**On Windows:**
```bash
setup.bat
```

**On macOS/Linux:**
```bash
bash setup.sh
```

This will:
- Install all dependencies
- Create `.env` files from templates
- Set up project structure

### 3. Configure Environment Variables

#### Frontend (.env.local)

```env
VITE_API_URL=http://localhost:3000
VITE_AI_SERVICE_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=YOUR_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET=YOUR_PROJECT.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
VITE_FIREBASE_APP_ID=YOUR_APP_ID
```

#### Backend (.env)

```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/academic_platform
FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
FIREBASE_PRIVATE_KEY=YOUR_PRIVATE_KEY
FIREBASE_CLIENT_EMAIL=YOUR_EMAIL@iam.gserviceaccount.com
JWT_SECRET=your-secret-key-here
CORS_ORIGIN=http://localhost:5173
AI_SERVICE_URL=http://localhost:8000
```

#### AI Service (.env)

```env
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/academic_platform
MODEL_NAME=sentence-transformers/paraphrase-MiniLM-L6-v2
CORS_ORIGIN=http://localhost:5173
BACKEND_URL=http://localhost:3000
```

### 4. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Authentication (Email/Password and Google)
4. Create a service account in Project Settings
5. Download the JSON key file
6. Use values from the key file in your `.env`

### 5. MongoDB Setup

1. Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster
3. Create a database user
4. Get connection string
5. Add to `MONGODB_URI` in `.env` files

## Development

### Terminal 1: Frontend

```bash
cd frontend
npm run dev
```

Access at: [http://localhost:5173](http://localhost:5173)

### Terminal 2: Backend

```bash
cd backend
npm run dev
```

API available at: [http://localhost:3000/api/v1](http://localhost:3000/api/v1)

### Terminal 3: AI Service

```bash
cd ai-service
python main.py
```

AI Service at: [http://localhost:8000](http://localhost:8000)

## Verify Installation

### Check Backend Health

```bash
curl http://localhost:3000/api/v1/health
```

Expected response:
```json
{ "status": "ok", "timestamp": "2024-02-08T10:30:00Z" }
```

### Check AI Service Health

```bash
curl http://localhost:8000/api/v1/health
```

Expected response:
```json
{
  "status": "healthy",
  "model": "sentence-transformers/paraphrase-MiniLM-L6-v2",
  "version": "1.0.0"
}
```

## Create Test User

### Via Frontend

1. Go to [http://localhost:5173/signup](http://localhost:5173/signup)
2. Sign up with test credentials
3. You'll be redirected to dashboard

### Via Firebase Console

1. Go to Firebase Console
2. Authentication → Users → Add User
3. Enter test email and password

## Common Issues

### "Cannot find module" Error

```bash
# In the affected directory
rm -rf node_modules package-lock.json
npm install
```

### MongoDB Connection Error

- Verify connection string in `.env`
- Check IP whitelist in MongoDB Atlas
- Ensure database user has correct permissions

### CORS Errors

- Verify `CORS_ORIGIN` matches frontend URL
- Check browser DevTools for exact error

### Python Module Not Found

```bash
cd ai-service
python -m pip install -r requirements.txt
```

## Project Structure

```
smart/
├── frontend/          # React + Vite
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── types/
│   │   └── styles/
│   └── package.json
│
├── backend/           # Node.js + Hono
│   ├── src/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── services/
│   │   └── config/
│   └── package.json
│
├── ai-service/        # FastAPI + Transformers
│   ├── app/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── config/
│   └── main.py
│
├── docs/              # Documentation
│   ├── API.md
│   ├── DEPLOYMENT.md
│   └── FRONTEND_ROADMAP.md
│
├── docker-compose.yml # Container orchestration
├── README.md
└── .env.example       # Environment template
```

## Next Steps

1. **Explore the Dashboard**: Navigate through different sections
2. **Upload a Resource**: Test the file upload functionality
3. **Search Semantically**: Try the AI-powered search
4. **Create a Discussion**: Post a question in the forum
5. **Explore Admin Features**: If admin, check the admin panel

## API Documentation

Full API documentation available in [docs/API.md](docs/API.md)

Quick endpoints:
- `GET /api/v1/health` - Server health
- `POST /api/v1/auth/signup` - User registration
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/resources` - List resources
- `POST /api/v1/search/semantic` - Search

## Performance Tips

1. **Clear Browser Cache**: If styles don't load
   ```bash
   # Frontend
   npm run build  # Create optimized build
   ```

2. **Index Database**: For better search performance
   ```bash
   # In MongoDB shell
   db.resources.createIndex({ title: "text", description: "text" })
   ```

3. **Enable Caching**: In production
   - Configure Redis in backend
   - Set up CDN for static assets

## Debugging

### Enable Debug Logging

```bash
# Backend
export LOG_LEVEL=debug
npm run dev

# Frontend
# Open DevTools (F12) and check Console tab
```

### Monitor Database

```bash
# MongoDB Atlas Dashboard
# - Collections
# - Metrics
# - Logs
```

## Production Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for:
- Docker deployment
- AWS EC2 setup
- Kubernetes configuration
- SSL/HTTPS setup

## Support & Documentation

- **API Docs**: [docs/API.md](docs/API.md)
- **Deployment**: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- **Frontend Roadmap**: [docs/FRONTEND_ROADMAP.md](docs/FRONTEND_ROADMAP.md)
- **Main README**: [README.md](README.md)

## Next Phase Features

- [ ] User reputation system
- [ ] Resource recommendations
- [ ] Advanced analytics dashboard
- [ ] Mobile app (React Native)
- [ ] Automated document summarization
- [ ] AI chatbot for queries
- [ ] Video streaming support

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

MIT

---

Happy building! 🚀
