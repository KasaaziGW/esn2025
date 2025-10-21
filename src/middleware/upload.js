// src/middleware/upload.js
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 10);

//Directories
export const UPLOAD_DIRS = {
  chat: path.join(process.cwd(), 'src', 'uploads', 'chats'),
  announcement: path.join(process.cwd(), 'src', 'uploads', 'announcements'),
  profile: path.join(process.cwd(), 'src', 'uploads', 'profiles'),
  system: path.join(process.cwd(), 'src', 'uploads', 'system'),
  community: path.join(process.cwd(), 'src', 'uploads', 'communities')
};

// Ensure all upload directories exist
Object.values(UPLOAD_DIRS).forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Allowed MIME types for uploads
const ALLOWED_MIME = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip',
  'video/mp4', 'video/quicktime'
];

// Multer Storage Factory 
const storageFactory = (uploadDir) => multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.bin';
    const filename = `${Date.now()}-${nanoid()}${ext}`;
    cb(null, filename);
  }
});

// File Filter 
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type'), false);
  }
};

//  Max File Size 
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB


// Single chat file upload
export const uploadSingleChatFile = multer({
  storage: storageFactory(UPLOAD_DIRS.chat),
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter
}).single('file'); // expects field name 'file'

// Multiple announcement attachments (max 5)
export const uploadAnnouncementFiles = multer({
  storage: storageFactory(UPLOAD_DIRS.announcement),
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter
}).array('attachments', 5); // expects field 'attachments'

// Single profile photo upload
export const uploadProfilePhoto = multer({
  storage: storageFactory(UPLOAD_DIRS.profile),
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter
}).single('profile');

// Single system logo/icon upload
export const uploadSystemFile = multer({
  storage: storageFactory(UPLOAD_DIRS.system),
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter
}).single('file');

// Single community banner upload
export const uploadCommunityBanner = multer({
  storage: storageFactory(UPLOAD_DIRS.community),
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter
}).single('banner');

// Export directories in case controllers need them
export default UPLOAD_DIRS;
