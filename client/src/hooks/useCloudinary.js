import { useState } from 'react';
import { uploadToCloudinary } from '../utils/cloudinary';

export const useCloudinaryUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadFile = async (file, folder = 'student-events') => {
    try {
      setUploading(true);
      setUploadProgress(0);

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const result = await uploadToCloudinary(file, folder);

      // Complete progress
      clearInterval(progressInterval);
      setUploadProgress(100);

      // Reset progress after a delay
      setTimeout(() => {
        setUploadProgress(0);
      }, 1000);

      return result;
    } catch (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: error.message || 'Upload failed'
      };
    } finally {
      setUploading(false);
    }
  };

  return {
    uploading,
    uploadProgress,
    uploadFile
  };
};

export default useCloudinaryUpload;