import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

export default function OAuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");
      const userB64 = params.get("user");

      if (!token || !userB64) {
        toast.error("Invalid OAuth response");
        navigate("/", { replace: true });
        return;
      }

      const userJson = atob(userB64);
      const user = JSON.parse(userJson);

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      toast.success("✅ Logged in with Google");

      // Redirect by role
      const role = user.role;
      if (role === "admin") navigate("/admin", { replace: true });
      else if (role === "host") navigate("/host-dashboard", { replace: true });
      else navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error(err);
      toast.error("OAuth processing failed");
      navigate("/", { replace: true });
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      Processing login...
    </div>
  );
}
