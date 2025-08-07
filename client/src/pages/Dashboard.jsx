// src/pages/Dashboard.jsx
import React from "react";
import { jwtDecode } from "jwt-decode";

export default function Dashboard() {
  const token = localStorage.getItem("token");
  let user = null;

  try {
    if (token) {
      user = jwtDecode(token);
    }
  } catch (err) {
    console.error("❌ Invalid JWT token:", err.message);
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-10">
      <h1 className="text-3xl font-bold mb-4">🎉 Welcome to your Dashboard</h1>
      {user ? (
        <div className="bg-gray-800 p-6 rounded-xl shadow-xl w-full max-w-md">
          <p><strong>👤 Username:</strong> {user.username || "N/A"}</p>
          <p><strong>📧 Email:</strong> {user.email || "N/A"}</p>
          {/* Add more fields as needed */}
        </div>
      ) : (
        <p className="text-red-400">You are not logged in or your session has expired.</p>
      )}
    </div>
  );
}
