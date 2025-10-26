// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;

// Function to upload file to Cloudinary
export const uploadToCloudinary = async (file, folder = 'student-events') => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', folder);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`,
      {
        method: 'POST',
        body: formData
      }
    );

    const data = await response.json();
    
    if (data.secure_url) {
      return {
        success: true,
        url: data.secure_url,
        public_id: data.public_id
      };
    } else {
      return {
        success: false,
        error: data.error?.message || 'Upload failed'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Upload failed'
    };
  }
};

// Function to upload profile picture
export const uploadProfilePicture = async (file) => {
  return uploadToCloudinary(file, 'student-events/profiles');
};

// Function to upload banner
export const uploadBanner = async (file) => {
  return uploadToCloudinary(file, 'student-events/banners');
};

// Function to upload document
export const uploadDocument = async (file) => {
  return uploadToCloudinary(file, 'student-events/documents');
};

export default {
  uploadToCloudinary,
  uploadProfilePicture,
  uploadBanner,
  uploadDocument
};