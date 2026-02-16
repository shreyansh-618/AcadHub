// MongoDB initialization script
// Run this after first deployment

db = db.getSiblingDB('academic_platform');

// Create users collection with unique indexes
db.createCollection("users");
db.users.createIndex({ "uid": 1 }, { unique: true });
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "role": 1 });
db.users.createIndex({ "isActive": 1 });

// Create resources collection with text index for full-text search
db.createCollection("resources");
db.resources.createIndex({ "title": "text", "description": "text" });
db.resources.createIndex({ "department": 1, "subject": 1, "semester": 1 });
db.resources.createIndex({ "isApproved": 1, "createdAt": -1 });
db.resources.createIndex({ "uploadedBy": 1 });
db.resources.createIndex({ "category": 1 });

// Create embeddings collection for semantic search
db.createCollection("embeddings");
db.embeddings.createIndex({ "resourceId": 1 }, { unique: true });
db.embeddings.createIndex({ "embedding": "2dsphere" });

// Create discussions collection
db.createCollection("discussions");
db.discussions.createIndex({ "title": "text", "content": "text" });
db.discussions.createIndex({ "author": 1 });
db.discussions.createIndex({ "subject": 1, "department": 1 });
db.discussions.createIndex({ "isResolved": 1 });
db.discussions.createIndex({ "createdAt": -1 });
db.discussions.createIndex({ "tags": 1 });

// Create answers collection
db.createCollection("answers");
db.answers.createIndex({ "discussionId": 1, "createdAt": -1 });
db.answers.createIndex({ "author": 1 });
db.answers.createIndex({ "isAccepted": 1 });

// Create events collection
db.createCollection("events");
db.events.createIndex({ "title": "text", "description": "text" });
db.events.createIndex({ "startDate": 1, "isPublished": 1 });
db.events.createIndex({ "organizer": 1 });
db.events.createIndex({ "eventType": 1 });

// Create notifications collection
db.createCollection("notifications");
db.notifications.createIndex({ "userId": 1, "isRead": 1 });
db.notifications.createIndex({ "createdAt": -1 });

// Create search logs for analytics
db.createCollection("search_logs");
db.search_logs.createIndex({ "userId": 1, "createdAt": -1 });
db.search_logs.createIndex({ "query": 1 });

// Create file uploads collection (for GridFS)
db.fs.files.createIndex({ "uploadDate": -1 });
db.fs.files.createIndex({ "metadata.resourceId": 1 }, { unique: true });

// Set up TTL indexes for temporary data (auto-delete after 30 days)
db.createCollection("sessions");
db.sessions.createIndex({ "createdAt": 1 }, { expireAfterSeconds: 2592000 });

// Create admin user (password will be set through Firebase)
db.users.insertOne({
    uid: "admin-uid",
    email: "admin@academicplatform.com",
    name: "Administrator",
    role: "admin",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
});

print("MongoDB initialization completed successfully!");
