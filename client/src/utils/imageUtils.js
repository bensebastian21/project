import config from '../config';

// Check if a URL is a Cloudinary URL
export const isCloudinaryUrl = (url) => {
  return url && url.startsWith('http') && url.includes('cloudinary.com');
};

// Convert local image path to Cloudinary URL if needed or fully qualifed local URL
export const getImageUrl = (imagePath, transformations = 'c_fill,w_800,h_600') => {
  if (!imagePath) return '';

  // If it's already a full URL (including Cloudinary), or a base64 data URL, return as is
  if (imagePath.startsWith('http') || imagePath.startsWith('blob:') || imagePath.startsWith('data:')) {
    return imagePath;
  }

  // If it's a local path, check if we should use Cloudinary
  const cloudName = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;

  // If Cloudinary is configured and the path starts with uploads/, use Cloudinary
  if (cloudName && imagePath.startsWith('uploads/')) {
    // Remove uploads/ prefix and construct Cloudinary URL
    const publicId = imagePath.replace('uploads/', '');
    return `https://res.cloudinary.com/${cloudName}/image/upload/${transformations}/${publicId}`;
  }

  // Otherwise, return the local path with base URL
  // config.apiBaseUrl typically includes /api, so we strip it for static files
  const baseUrl = config.apiBaseUrl.replace('/api', '');
  const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
  // If path doesn't start with uploads/ or assets/, assume it needs uploads/
  const isUpload = !cleanPath.startsWith('uploads') && !cleanPath.startsWith('assets');
  return `${baseUrl}/${isUpload ? 'uploads/' : ''}${cleanPath}`;
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
  getBannerUrl,
};
