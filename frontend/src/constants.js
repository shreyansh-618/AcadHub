/**
 * @typedef {('student' | 'faculty' | 'admin')} UserRole
 *
 * @typedef {Object} User
 * @property {string} id
 * @property {string} email
 * @property {string} name
 * @property {UserRole} role
 * @property {string} [department]
 * @property {string} [avatar]
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} AuthState
 * @property {User | null} user
 * @property {boolean} isAuthenticated
 * @property {boolean} isLoading
 */

/**
 * @typedef {('pdf' | 'pptx' | 'docx' | 'doc' | 'txt' | 'image')} ResourceType
 * @typedef {('lecture-notes' | 'textbooks' | 'question-papers' | 'assignments' | 'other')} ResourceCategory
 *
 * @typedef {Object} Resource
 * @property {string} id
 * @property {string} title
 * @property {string} [description]
 * @property {ResourceType} type
 * @property {ResourceCategory} category
 * @property {string} department
 * @property {string} subject
 * @property {number} semester
 * @property {string} academicYear
 * @property {string} uploadedBy
 * @property {string} uploadedByName
 * @property {string} fileUrl
 * @property {string} filePath
 * @property {number} fileSize
 * @property {number} downloads
 * @property {number} likes
 * @property {string[]} likedBy
 * @property {boolean} isApproved
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} ResourcesFilters
 * @property {string} [department]
 * @property {string} [subject]
 * @property {number} [semester]
 * @property {ResourceCategory} [category]
 * @property {string} [academicYear]
 */

/**
 * @typedef {Object} SearchQuery
 * @property {string} query
 * @property {ResourcesFilters} [filters]
 * @property {number} [limit]
 * @property {number} [offset]
 */

/**
 * @typedef {Object} SearchResult
 * @property {string} id
 * @property {string} title
 * @property {string} [description]
 * @property {number} score
 * @property {ResourceType} resourceType
 * @property {ResourceCategory} category
 * @property {string} department
 * @property {string} subject
 */

/**
 * @typedef {Object} Author
 * @property {string} id
 * @property {string} name
 * @property {string} [avatar]
 */

/**
 * @typedef {Object} Discussion
 * @property {string} id
 * @property {string} title
 * @property {string} content
 * @property {Author} author
 * @property {string} subject
 * @property {string} department
 * @property {string[]} linkedResources
 * @property {string[]} tags
 * @property {number} views
 * @property {number} answers
 * @property {boolean} isResolved
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} Answer
 * @property {string} id
 * @property {string} discussionId
 * @property {string} content
 * @property {Author} author
 * @property {number} upvotes
 * @property {boolean} isAccepted
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} Event
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} type
 * @property {Date} startDate
 * @property {Date} endDate
 * @property {string} location
 * @property {Author} organizer
 * @property {number} registeredCount
 * @property {number} capacity
 * @property {string} department
 * @property {boolean} isPublished
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} Notification
 * @property {string} id
 * @property {string} userId
 * @property {string} type
 * @property {string} title
 * @property {string} message
 * @property {boolean} isRead
 * @property {Object} [metadata]
 * @property {string} createdAt
 */

/**
 * @typedef {Object} PaginatedResponse
 * @template T
 * @property {T[]} data
 * @property {number} total
 * @property {number} page
 * @property {number} limit
 * @property {number} pages
 */

// Constants for resource types and categories
export const RESOURCE_TYPES = {
  PDF: "pdf",
  PPTX: "pptx",
  DOCX: "docx",
  DOC: "doc",
  TXT: "txt",
  IMAGE: "image",
};

export const RESOURCE_CATEGORIES = {
  LECTURE_NOTES: "lecture-notes",
  TEXTBOOKS: "textbooks",
  QUESTION_PAPERS: "question-papers",
  ASSIGNMENTS: "assignments",
  OTHER: "other",
};

export const USER_ROLES = {
  STUDENT: "student",
  FACULTY: "faculty",
  ADMIN: "admin",
};

export const EVENT_TYPES = {
  SEMINAR: "seminar",
  WORKSHOP: "workshop",
  LECTURE: "lecture",
  CONFERENCE: "conference",
  EXAM: "exam",
  ASSIGNMENT_DUE: "assignment_due",
};

export const NOTIFICATION_TYPES = {
  RESOURCE_UPLOADED: "resource_uploaded",
  DISCUSSION_ANSWERED: "discussion_answered",
  EVENT_REMINDER: "event_reminder",
  RESOURCE_APPROVED: "resource_approved",
  NEW_FOLLOWER: "new_follower",
};
