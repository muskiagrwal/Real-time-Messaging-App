const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const auth = require('../middleware/auth');

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for file uploads
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'chat-app',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mp3', 'pdf', 'doc', 'docx', 'txt'],
    resource_type: 'auto',
    transformation: [
      { width: 1000, height: 1000, crop: 'limit', quality: 'auto' }
    ]
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mp3|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, videos, audio, and documents are allowed.'));
    }
  }
});

// @route   POST /api/upload/single
// @desc    Upload a single file
// @access  Private
router.post('/single', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const fileData = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      url: req.file.path,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      uploadedAt: new Date()
    };

    res.json({
      message: 'File uploaded successfully',
      file: fileData
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'File upload failed' });
  }
});

// @route   POST /api/upload/multiple
// @desc    Upload multiple files
// @access  Private
router.post('/multiple', auth, upload.array('files', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const filesData = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      url: file.path,
      fileType: file.mimetype,
      fileSize: file.size,
      uploadedAt: new Date()
    }));

    res.json({
      message: 'Files uploaded successfully',
      files: filesData
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'File upload failed' });
  }
});

// @route   DELETE /api/upload/:publicId
// @desc    Delete a file from Cloudinary
// @access  Private
router.delete('/:publicId', auth, async (req, res) => {
  try {
    const { publicId } = req.params;

    const result = await cloudinary.uploader.destroy(publicId);
    
    if (result.result === 'ok') {
      res.json({ message: 'File deleted successfully' });
    } else {
      res.status(404).json({ message: 'File not found' });
    }
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ message: 'File deletion failed' });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 10MB.' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ message: 'Too many files. Maximum is 5 files.' });
    }
  }
  
  if (error.message === 'Invalid file type. Only images, videos, audio, and documents are allowed.') {
    return res.status(400).json({ message: error.message });
  }

  console.error('Upload middleware error:', error);
  res.status(500).json({ message: 'File upload error' });
});

module.exports = router;
