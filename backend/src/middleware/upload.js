import multer from "multer";
import path from "node:path";

// Use memory storage since we'll upload to GridFS
const storage = multer.memoryStorage();

const allowedFileTypes = {
  ".pdf": ["application/pdf"],
  ".doc": ["application/msword"],
  ".docx": [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  ".pptx": [
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ],
  ".txt": ["text/plain"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".png": ["image/png"],
  ".gif": ["image/gif"],
  ".webp": ["image/webp"],
};

const fileFilter = (req, file, cb) => {
  const extension = path.extname(file.originalname || "").toLowerCase();
  const allowedMimes = allowedFileTypes[extension];

  if (allowedMimes && allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new multer.MulterError("LIMIT_UNEXPECTED_FILE", "Unsupported file type"),
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

export default upload;
