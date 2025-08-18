// src/pages/Dashboard.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Use JWT/localStorage user only
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (_) {
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setLoading(false);
  }, []);

  const handleLogout = async () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser(null);
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-10">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-10">
      <h1 className="text-3xl font-bold mb-4">🎉 Welcome to your Dashboard</h1>
      {user ? (
        <div className="bg-gray-800 p-6 rounded-xl shadow-xl w-full max-w-md">
          <div className="mb-4">
            <p><strong>👤 Username:</strong> {user.username || "N/A"}</p>
            <p><strong>📝 Full Name:</strong> {user.fullname || "N/A"}</p>
            <p><strong>📧 Email:</strong> {user.email || "N/A"}</p>
            <p><strong>🏫 Institute:</strong> {user.institute || "N/A"}</p>
            <p><strong>📚 Course:</strong> {user.course || "N/A"}</p>
            <p><strong>📱 Phone:</strong> {user.countryCode} {user.phone || "N/A"}</p>
            <p><strong>📍 Address:</strong> {user.street}, {user.city} - {user.pincode}</p>
            <p><strong>🎂 Age:</strong> {user.age || "N/A"}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            🚪 Logout
          </button>
        </div>
      ) : (
        <div className="text-center">
          <p className="text-red-400 mb-4">You are not logged in or your session has expired.</p>
          <button
            onClick={() => navigate("/")}
            className="bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            🔐 Go to Login
          </button>
        </div>
      )}
    </div>
  );
}
