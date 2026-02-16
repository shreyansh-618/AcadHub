# API Documentation

This document provides comprehensive API documentation for the Academic Platform.

## Base URL

```
http://localhost:3000/api/v1
```

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <firebase_id_token>
```

---

## Authentication Endpoints

### 1. Sign Up

**Endpoint:** `POST /auth/signup`

**Description:** Create a new user account

**Request Body:**
```json
{
  "email": "student@example.com",
  "password": "securepassword",
  "name": "John Doe",
  "role": "student",
  "department": "Computer Science"
}
```

**Response (201 Created):**
```json
{
  "code": "SUCCESS",
  "message": "User created successfully",
  "data": {
    "id": "user_id",
    "email": "student@example.com",
    "name": "John Doe",
    "role": "student",
    "department": "Computer Science",
    "createdAt": "2024-02-08T10:30:00Z"
  }
}
```

---

### 2. Login

**Endpoint:** `POST /auth/login`

**Description:** Login with email and password

**Request Body:**
```json
{
  "email": "student@example.com",
  "password": "securepassword"
}
```

**Response (200 OK):**
```json
{
  "code": "SUCCESS",
  "message": "Login successful",
  "data": {
    "id": "user_id",
    "email": "student@example.com",
    "name": "John Doe",
    "role": "student",
    "token": "firebase_id_token"
  }
}
```

---

### 3. Google OAuth Login

**Endpoint:** `POST /auth/google`

**Description:** Login or create account via Google OAuth

**Request Body:**
```json
{
  "tokenId": "google_id_token"
}
```

**Response (200/201):**
Same as login response

---

### 4. Logout

**Endpoint:** `POST /auth/logout`

**Description:** Logout current user

**Authentication:** Required

**Response (200 OK):**
```json
{
  "code": "SUCCESS",
  "message": "Logged out successfully"
}
```

---

## Resource Endpoints

### 1. List Resources

**Endpoint:** `GET /resources`

**Description:** List academic resources with pagination and filtering

**Query Parameters:**
- `department` (optional): Filter by department
- `subject` (optional): Filter by subject
- `category` (optional): Filter by category
- `semester` (optional): Filter by semester
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 20): Items per page

**Response (200 OK):**
```json
{
  "code": "SUCCESS",
  "message": "Resources retrieved",
  "data": [
    {
      "id": "resource_id",
      "title": "Data Structures Lecture Notes",
      "description": "Complete lecture notes for Data Structures",
      "type": "pdf",
      "category": "lecture-notes",
      "department": "Computer Science",
      "subject": "Data Structures",
      "semester": 2,
      "academicYear": "2024",
      "uploadedBy": "faculty_id",
      "uploadedByName": "Dr. Smith",
      "downloads": 150,
      "likes": 45,
      "createdAt": "2024-01-15T08:00:00Z"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "pages": 5,
    "hasMore": true
  }
}
```

---

### 2. Upload Resource

**Endpoint:** `POST /resources`

**Description:** Upload a new academic resource

**Authentication:** Required (Faculty/Admin only)

**Content-Type:** `multipart/form-data`

**Form Data:**
- `file` (required): File to upload
- `title` (required): Resource title
- `description` (optional): Resource description
- `type` (required): File type (pdf, pptx, docx, doc, txt, image)
- `category` (required): Resource category
- `department` (required): Academic department
- `subject` (required): Subject name
- `semester` (required): Semester number
- `academicYear` (required): Academic year

**Response (201 Created):**
```json
{
  "code": "SUCCESS",
  "message": "Resource uploaded successfully",
  "data": {
    "id": "resource_id",
    "title": "Data Structures Lecture Notes",
    "type": "pdf",
    "fileUrl": "/files/resource_id.pdf",
    "fileSize": 2048000,
    "isApproved": false,
    "createdAt": "2024-02-08T10:30:00Z"
  }
}
```

---

### 3. Get Resource Details

**Endpoint:** `GET /resources/:id`

**Description:** Get detailed information about a resource

**Response (200 OK):**
```json
{
  "code": "SUCCESS",
  "message": "Resource retrieved",
  "data": {
    "id": "resource_id",
    "title": "Data Structures Lecture Notes",
    "description": "Complete lecture notes",
    "type": "pdf",
    "category": "lecture-notes",
    "department": "Computer Science",
    "subject": "Data Structures",
    "semester": 2,
    "academicYear": "2024",
    "uploadedBy": "faculty_id",
    "uploadedByName": "Dr. Smith",
    "fileUrl": "/files/resource_id.pdf",
    "fileSize": 2048000,
    "downloads": 150,
    "likes": 45,
    "likedBy": ["user_id_1", "user_id_2"],
    "isApproved": true,
    "approvedBy": "admin_id",
    "approvedAt": "2024-01-20T12:00:00Z",
    "createdAt": "2024-01-15T08:00:00Z"
  }
}
```

---

### 4. Like/Unlike Resource

**Endpoint:** `POST /resources/:id/like`

**Description:** Like or unlike a resource

**Authentication:** Required

**Response (200 OK):**
```json
{
  "code": "SUCCESS",
  "message": "Liked successfully",
  "data": {
    "id": "resource_id",
    "likes": 46,
    "likedBy": ["user_id_1", "user_id_2", "current_user_id"]
  }
}
```

---

### 5. Delete Resource

**Endpoint:** `DELETE /resources/:id`

**Description:** Delete a resource

**Authentication:** Required (Owner/Admin only)

**Response (200 OK):**
```json
{
  "code": "SUCCESS",
  "message": "Resource deleted successfully"
}
```

---

## Semantic Search Endpoints

### 1. Semantic Search

**Endpoint:** `POST /search/semantic`

**Description:** Perform semantic search on resources

**Request Body:**
```json
{
  "query": "Find last year's Computer Networks question papers",
  "limit": 10,
  "offset": 0,
  "filters": {
    "department": "Computer Science",
    "subject": "Computer Networks",
    "category": "question-papers"
  }
}
```

**Response (200 OK):**
```json
{
  "code": "SUCCESS",
  "message": "Search results retrieved",
  "data": [
    {
      "id": "resource_id",
      "title": "CN Question Paper 2023",
      "description": "Computer Networks semester exam question paper",
      "score": 0.95,
      "resourceType": "pdf",
      "category": "question-papers",
      "department": "Computer Science",
      "subject": "Computer Networks"
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "pages": 3,
    "hasMore": true
  }
}
```

---

### 2. Get Text Embedding

**Endpoint:** `POST /search/embed` (AI Service only)

**Description:** Get embedding for a text

**Request Body:**
```json
{
  "text": "Data structures and algorithms"
}
```

**Response (200 OK):**
```json
{
  "embedding": [0.123, -0.456, ...],
  "dimension": 384,
  "model": "sentence-transformers/paraphrase-MiniLM-L6-v2"
}
```

---

## Discussion & Q&A Endpoints

### 1. List Discussions

**Endpoint:** `GET /discussions`

**Description:** List discussions with pagination and filtering

**Query Parameters:**
- `subject` (optional): Filter by subject
- `department` (optional): Filter by department
- `isResolved` (optional): Filter by resolution status
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response (200 OK):**
```json
{
  "code": "SUCCESS",
  "message": "Discussions retrieved",
  "data": [
    {
      "id": "discussion_id",
      "title": "How to implement binary search?",
      "content": "I'm having trouble understanding binary search...",
      "author": {
        "id": "user_id",
        "name": "John Doe",
        "avatar": "url"
      },
      "subject": "Data Structures",
      "department": "Computer Science",
      "linkedResources": ["resource_id_1"],
      "tags": ["algorithms", "binary-search"],
      "views": 150,
      "answers": 5,
      "isResolved": true,
      "createdAt": "2024-02-01T10:00:00Z",
      "updatedAt": "2024-02-05T14:30:00Z"
    }
  ],
  "pagination": { ... }
}
```

---

### 2. Create Discussion

**Endpoint:** `POST /discussions`

**Description:** Create a new discussion/question

**Authentication:** Required

**Request Body:**
```json
{
  "title": "How to implement binary search?",
  "content": "I'm having trouble understanding binary search...",
  "subject": "Data Structures",
  "department": "Computer Science",
  "linkedResources": ["resource_id"],
  "tags": ["algorithms", "binary-search"]
}
```

**Response (201 Created):**
```json
{
  "code": "SUCCESS",
  "message": "Discussion created successfully",
  "data": {
    "id": "discussion_id",
    "title": "How to implement binary search?",
    "content": "I'm having trouble understanding binary search...",
    "author": { ... },
    "subject": "Data Structures",
    "department": "Computer Science",
    "linkedResources": ["resource_id"],
    "tags": ["algorithms", "binary-search"],
    "views": 0,
    "answers": 0,
    "isResolved": false,
    "createdAt": "2024-02-08T10:30:00Z"
  }
}
```

---

### 3. Post Answer

**Endpoint:** `POST /discussions/:id/answers`

**Description:** Post an answer to a discussion

**Authentication:** Required

**Request Body:**
```json
{
  "content": "Binary search works on sorted arrays..."
}
```

**Response (201 Created):**
```json
{
  "code": "SUCCESS",
  "message": "Answer posted successfully",
  "data": {
    "id": "answer_id",
    "discussionId": "discussion_id",
    "content": "Binary search works on sorted arrays...",
    "author": {
      "id": "user_id",
      "name": "Dr. Smith",
      "role": "faculty"
    },
    "upvotes": 0,
    "upvotedBy": [],
    "isAccepted": false,
    "createdAt": "2024-02-08T10:35:00Z"
  }
}
```

---

### 4. Upvote Answer

**Endpoint:** `POST /discussions/:discussionId/answers/:answerId/upvote`

**Description:** Upvote a helpful answer

**Authentication:** Required

**Response (200 OK):**
```json
{
  "code": "SUCCESS",
  "message": "Upvoted successfully",
  "data": {
    "id": "answer_id",
    "upvotes": 15,
    "upvotedBy": ["user_id_1", "user_id_2", ...]
  }
}
```

---

## Event Management Endpoints

### 1. List Events

**Endpoint:** `GET /events`

**Description:** List academic events with filtering

**Query Parameters:**
- `eventType` (optional): Filter by event type
- `department` (optional): Filter by department
- `startDate` (optional): Filter events after date
- `endDate` (optional): Filter events before date

**Response (200 OK):**
```json
{
  "code": "SUCCESS",
  "message": "Events retrieved",
  "data": [
    {
      "id": "event_id",
      "title": "Data Structures Workshop",
      "description": "Interactive workshop on advanced data structures",
      "eventType": "workshop",
      "department": "Computer Science",
      "subject": "Data Structures",
      "startDate": "2024-03-15T10:00:00Z",
      "endDate": "2024-03-15T13:00:00Z",
      "location": "Lab 201",
      "organizer": {
        "id": "faculty_id",
        "name": "Dr. Smith"
      },
      "attendees": 45,
      "registeredUsers": ["user_id_1", "user_id_2", ...],
      "isPublished": true,
      "createdAt": "2024-02-01T08:00:00Z"
    }
  ]
}
```

---

### 2. Create Event

**Endpoint:** `POST /events`

**Description:** Create a new academic event

**Authentication:** Required (Faculty/Admin only)

**Request Body:**
```json
{
  "title": "Data Structures Workshop",
  "description": "Interactive workshop on advanced data structures",
  "eventType": "workshop",
  "department": "Computer Science",
  "subject": "Data Structures",
  "startDate": "2024-03-15T10:00:00Z",
  "endDate": "2024-03-15T13:00:00Z",
  "location": "Lab 201"
}
```

**Response (201 Created):**
```json
{
  "code": "SUCCESS",
  "message": "Event created successfully",
  "data": { ... }
}
```

---

### 3. Register for Event

**Endpoint:** `POST /events/:id/register`

**Description:** Register for an event

**Authentication:** Required

**Response (200 OK):**
```json
{
  "code": "SUCCESS",
  "message": "Registered successfully",
  "data": {
    "id": "event_id",
    "registered": true,
    "attendees": 46
  }
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "code": "ERROR_CODE",
  "message": "Human readable error message",
  "details": { "field": "error description" }
}
```

### Common Error Codes

- `UNAUTHORIZED`: User not authenticated
- `FORBIDDEN`: User lacks permission
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Invalid request data
- `DUPLICATE_ENTRY`: Resource already exists
- `INTERNAL_SERVER_ERROR`: Server error

---

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- Default: 100 requests per 15 minutes per IP
- Search endpoints: 50 requests per 15 minutes per user

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 80
X-RateLimit-Reset: 1675900800
```

---

## Pagination

List endpoints support pagination with these parameters:

- `page`: Page number (1-indexed)
- `limit`: Items per page (default: 20, max: 100)

Response includes:
```json
{
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "pages": 5,
    "hasMore": true
  }
}
```

---

## WebSocket Events (Real-time)

Connect to `/socket.io` for real-time updates:

### Events to Listen:

```javascript
socket.on('discussion:new-answer', (answer) => {
  // New answer posted to a discussion
});

socket.on('resource:approved', (resource) => {
  // Admin approved a resource
});

socket.on('event:updated', (event) => {
  // Event details updated
});
```

---

## Examples

### Example: Search for Question Papers

```bash
curl -X POST http://localhost:3000/api/v1/search/semantic \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Computer Networks question papers 2023",
    "limit": 10,
    "filters": {
      "category": "question-papers",
      "subject": "Computer Networks",
      "academicYear": "2023"
    }
  }'
```

### Example: Upload a Resource

```bash
curl -X POST http://localhost:3000/api/v1/resources \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@notes.pdf" \
  -F "title=Data Structures Notes" \
  -F "type=pdf" \
  -F "category=lecture-notes" \
  -F "department=Computer Science" \
  -F "subject=Data Structures" \
  -F "semester=2" \
  -F "academicYear=2024"
```

### Example: Create a Discussion

```bash
curl -X POST http://localhost:3000/api/v1/discussions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "How does quicksort work?",
    "content": "Can someone explain quicksort algorithm...",
    "subject": "Data Structures",
    "department": "Computer Science",
    "tags": ["sorting", "algorithms"]
  }'
```

---

## Support

For API issues or questions, please create an issue in the repository or contact the development team.
