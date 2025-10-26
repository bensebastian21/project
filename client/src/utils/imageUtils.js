// Utility functions for handling images

// Check if a URL is a Cloudinary URL
export const isCloudinaryUrl = (url) => {
  return url && (url.startsWith('http') && url.includes('cloudinary.com'));
};

// Convert local image path to Cloudinary URL if needed
export const getImageUrl = (imagePath, transformations = 'c_fill,w_800,h_600') => {
  // If it's already a full URL (including Cloudinary), return as is
  if (isCloudinaryUrl(imagePath)) {
    return imagePath;
  }
  
  // If it's a local path, check if we should use Cloudinary
  const cloudName = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
  
  // If Cloudinary is configured and the path starts with uploads/, use Cloudinary
  if (cloudName && imagePath && imagePath.startsWith('uploads/')) {
    // Remove uploads/ prefix and construct Cloudinary URL
    const publicId = imagePath.replace('uploads/', '');
    return `https://res.cloudinary.com/${cloudName}/image/upload/${transformations}/${publicId}`;
  }
  
  // Otherwise, return the original path (assumed to be a local path)
  return imagePath;
};

// Get a thumbnail version of an image
export const getThumbnailUrl = (imagePath) => {
  return getImageUrl(imagePath, 'c_fill,w_200,h_200');
};

// Get a profile picture version of an image
export const getProfilePictureUrl = (imagePath) => {
  return getImageUrl(imagePath, 'c_fill,w_200,h_200,g_face,c_thumb');
};

// Get a banner version of an image
export const getBannerUrl = (imagePath) => {
  return getImageUrl(imagePath, 'c_fill,w_1200,h_400');
};

export default {
  isCloudinaryUrl,
  getImageUrl,
  getThumbnailUrl,
  getProfilePictureUrl,
  getBannerUrl
};