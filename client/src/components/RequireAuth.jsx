// src/components/RequireAuth.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import OnboardingGuard from "./OnboardingGuard";

// Guards routes by checking token and (optionally) allowed roles
export default function RequireAuth({ children, allowedRoles }) {
  const token = localStorage.getItem("token");
  const userRaw = localStorage.getItem("user");
  let user = null;
  try {
    user = userRaw ? JSON.parse(userRaw) : null;
  } catch (_) {
    user = null;
  }

  const location = useLocation();
  const roleOk = !allowedRoles || (user && allowedRoles.includes(user.role));
  const authorized = Boolean(token && user && roleOk);

  if (!authorized) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // For students, check onboarding completion
  if (user && user.role === "student") {
    return (
      <OnboardingGuard user={user}>
        {children}
      </OnboardingGuard>
    );
  }

  return children;
}