import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import StudentOnboarding from "./StudentOnboarding";
import config from "../config";

export default function OnboardingGuard({ children, user }) {
  const [onboardingStatus, setOnboardingStatus] = useState(null);
  const [isVerified, setIsVerified] = useState(null);
  const [loading, setLoading] = useState(true);
  const [redirectLogin, setRedirectLogin] = useState(false);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setRedirectLogin(true);
          setLoading(false);
          return;
        }

        const response = await fetch(`${config.apiBaseUrl}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const userData = await response.json();
          setOnboardingStatus(userData.onboardingCompleted);
          setIsVerified(!!userData.isStudentIdVerified);
        } else if (response.status === 401) {
          setRedirectLogin(true);
        } else {
          setOnboardingStatus(false);
          setIsVerified(false);
        }
      } catch (error) {
        console.error("Error checking onboarding status:", error);
        setRedirectLogin(true);
      } finally {
        setLoading(false);
      }
    };

    checkOnboardingStatus();
  }, []);

  const handleOnboardingComplete = () => {
    setOnboardingStatus(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (redirectLogin) {
    return <Navigate to="/login" replace />;
  }

  // If user is not a student, don't show onboarding
  if (user && user.role !== "student") {
    return children;
  }

  // Block student routes until verification is approved
  if (isVerified === false) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
        <div className="max-w-md text-center text-white">
          <h2 className="text-2xl font-bold mb-2">Verification Pending</h2>
          <p className="text-gray-300 mb-4">Your student documents are under review. You will gain access once an admin approves your verification.</p>
          <p className="text-sm text-gray-400">You may still log out or update your profile information.</p>
        </div>
      </div>
    );
  }

  // If onboarding is not completed, show onboarding form
  if (onboardingStatus === false) {
    return <StudentOnboarding onComplete={handleOnboardingComplete} user={user} />;
  }

  // If onboarding is completed, show the protected content
  return children;
}
