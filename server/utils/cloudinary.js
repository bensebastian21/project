const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Create Cloudinary storage for multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'student-events',
    allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'pdf']
  }
});

// Create storage for profile pictures
const profileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'student-events/profiles',
    allowed_formats: ['jpg', 'png', 'jpeg', 'gif']
  }
});

// Create storage for banners
const bannerStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'student-events/banners',
    allowed_formats: ['jpg', 'png', 'jpeg', 'gif']
  }
});

// Create storage for documents
const documentStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'student-events/documents',
    allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'pdf']
  }
});

module.exports = {
  cloudinary,
  storage,
  profileStorage,
  bannerStorage,
  documentStorage
};