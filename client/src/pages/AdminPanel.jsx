// src/components/AdminPanel.jsx
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
// Firebase removed
import { useNavigate } from "react-router-dom";
import { Users, Calendar, BarChart2, UserPlus, Trash2, Edit3, LogOut, Eye, ToggleLeft, ToggleRight, CheckCircle2, XCircle } from "lucide-react";
import config from "../config";

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  const [hosts, setHosts] = useState([]);
  const [hostApplications, setHostApplications] = useState([]);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [newHost, setNewHost] = useState({
    email: "",
    fullname: "",
    username: "",
    password: "",
    confirmPassword: "",
    role: "host",
    institute: "",
    street: "",
    city: "",
    pincode: "",
    age: "",
    course: "",
    phone: "",
    countryCode: "+91",
    institutionType: "", // optional UI-only field
  });

  const [hostErrors, setHostErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingHostId, setEditingHostId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [adminEvents, setAdminEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [editHostModal, setEditHostModal] = useState(false);
  const [editHostForm, setEditHostForm] = useState({});
  const [savingHost, setSavingHost] = useState(false);
  const [editTouched, setEditTouched] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [verifyItems, setVerifyItems] = useState([]);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [reasonById, setReasonById] = useState({});
  const navigate = useNavigate();

  // Validation functions
  const validateField = (field, value) => {
    switch (field) {
      case "email":
        return /\S+@\S+\.\S+/.test(value) ? "" : "Invalid email format";
      case "fullname":
        return value.length >= 2 ? "" : "Full name must be at least 2 characters";
      case "username":
        return value.length >= 3 ? "" : "Username must be at least 3 characters";
      case "password":
        return value.length >= 6 ? "" : "Password must be at least 6 characters";
      case "confirmPassword":
        return value === newHost.password ? "" : "Passwords do not match";
      case "institute":
        return value.length >= 2 ? "" : "Institution name is required";
      case "street":
        return value.length >= 5 ? "" : "Street address must be at least 5 characters";
      case "city":
        return value.length >= 2 ? "" : "City name is required";
      case "pincode":
        return /^\d{6}$/.test(value) ? "" : "Pincode must be 6 digits";
      case "age":
        const ageNum = parseInt(value);
        return ageNum >= 16 && ageNum <= 100 ? "" : "Contact person age must be between 16 and 100";
      case "course":
        return value.length >= 2 ? "" : "Department is required";
      case "phone":
        return /^\d{10}$/.test(value) ? "" : "Phone must be 10 digits";
      case "countryCode":
        return /^\+\d{1,4}$/.test(value) ? "" : "Invalid country code format";
      default:
        return "";
    }
  };

  const fetchPendingVerifications = async () => {
    try {
      setVerifyLoading(true);
      setVerifyError("");
      const token = localStorage.getItem("token");
      const res = await fetch(`${config.apiBaseUrl}/api/auth/admin/verification/student-ids?status=pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setVerifyItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      setVerifyError(e.message || "Failed to load pending");
    } finally {
      setVerifyLoading(false);
    }
  };

  const approveVerification = async (userId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${config.apiBaseUrl}/api/auth/admin/verification/student-id/${userId}/approve`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      await fetchPendingVerifications();
    } catch (e) {
      toast.error("Approve failed: " + e.message);
    }
  };

  const rejectVerification = async (userId) => {
    try {
      const token = localStorage.getItem("token");
      const reason = reasonById[userId] || "";
      const res = await fetch(`${config.apiBaseUrl}/api/auth/admin/verification/student-id/${userId}/reject`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ reason })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setReasonById(prev => ({ ...prev, [userId]: "" }));
      await fetchPendingVerifications();
    } catch (e) {
      toast.error("Reject failed: " + e.message);
    }
  };

  // Helpers for on-focus validation in Edit Host modal
  const handleEditFieldFocus = (field) => {
    setEditTouched((prev) => ({ ...prev, [field]: true }));
    const val = (editHostForm[field] ?? "").toString();
    const msg = validateField(field, val);
    setEditErrors((prev) => ({ ...prev, [field]: msg }));
  };

  const handleEditFieldChange = (field, value) => {
    setEditHostForm((f) => ({ ...f, [field]: value }));
    if (editTouched[field]) {
      // live-validate once field has been focused
      const msg = validateField(field, value);
      setEditErrors((prev) => ({ ...prev, [field]: msg }));
    }
    // Special rule: confirmPassword should match password when either changes
    if ((field === "password" || field === "confirmPassword") && editTouched["confirmPassword"]) {
      const matchMsg = (field === "password" ? value : editHostForm.password) === (field === "confirmPassword" ? value : editHostForm.confirmPassword)
        ? ""
        : "Passwords do not match";
      setEditErrors((prev) => ({ ...prev, confirmPassword: matchMsg }));
    }
  };

  const handleHostFieldChange = (field, value) => {
    setNewHost(prev => ({ ...prev, [field]: value }));
    if (touchedFields[field]) {
      const error = validateField(field, value);
      setHostErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  const handleHostFieldBlur = (field) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, newHost[field]);
    setHostErrors(prev => ({ ...prev, [field]: error }));
  };

  // On-focus validation for Add Host form
  const handleHostFieldFocus = (field) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
    const val = (newHost[field] ?? "").toString();
    const msg = validateField(field, val);
    setHostErrors(prev => ({ ...prev, [field]: msg }));
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  useEffect(() => {
    if (!localStorage.getItem("token") || !localStorage.getItem("user")) {
      navigate("/", { replace: true });
      return;
    }

    checkAdminStatus();
    fetchHosts();
    fetchAdminEvents();
    fetchMetrics();

    // prevent back after logout
    window.history.pushState(null, "", window.location.href);
    window.onpopstate = () => window.history.go(1);
  }, []);

  useEffect(() => {
    if (activeTab === "host-applications" || activeTab === "view-hosts") {
      fetchHostApplications();
    }
    if (activeTab === "verify-students") {
      fetchPendingVerifications();
    }
  }, [activeTab]);

  const checkAdminStatus = async () => {
    try {
      // Check if user is logged in via JWT token
      const token = localStorage.getItem("token");
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      
      if (!token || !userData.id) {
        navigate("/", { replace: true });
        return;
      }

      // Verify admin role from localStorage (set during login)
      if (userData.role !== "admin") {
        toast.error("Access denied. Admin privileges required.");
        navigate("/dashboard", { replace: true });
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error("Admin check error:", error);
      toast.error("Error checking admin status");
      navigate("/dashboard", { replace: true });
    } finally {
      setCheckingAdmin(false);
    }
  };

  const fetchHosts = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${config.apiBaseUrl}/api/auth/hosts`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      if (!res.ok) throw new Error("Failed to fetch hosts");
      const data = await res.json();
      setHosts(data);
    } catch (error) {
      toast.error("Error fetching hosts from MongoDB");
    }
  };

  const fetchHostApplications = async () => {
    try {
      setLoadingApplications(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`${config.apiBaseUrl}/api/auth/admin/host-applications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Failed to fetch host applications");
      const data = await response.json();
      setHostApplications(data);
    } catch (error) {
      toast.error("Error fetching host applications");
    } finally {
      setLoadingApplications(false);
    }
  };

  const approveHostApplication = async (hostId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${config.apiBaseUrl}/api/auth/admin/host-applications/${hostId}/approve`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      if (!response.ok) throw new Error("Failed to approve host application");
      toast.success("✅ Host application approved");
      fetchHostApplications();
      fetchHosts(); // Refresh the hosts list to show the newly approved host
    } catch (error) {
      toast.error("Error approving host application");
    }
  };

  const rejectHostApplication = async (hostId, rejectionReason) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${config.apiBaseUrl}/api/auth/admin/host-applications/${hostId}/reject`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ rejectionReason })
      });
      if (!response.ok) throw new Error("Failed to reject host application");
      toast.success("✅ Host application rejected");
      fetchHostApplications();
    } catch (error) {
      toast.error("Error rejecting host application");
    }
  };

  const fetchAdminEvents = async () => {
    try {
      setLoadingEvents(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${config.apiBaseUrl}/api/auth/admin/events`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch events");
      setAdminEvents(await res.json());
    } catch (e) {
      toast.error("Error fetching events");
    } finally {
      setLoadingEvents(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${config.apiBaseUrl}/api/auth/admin/metrics`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch metrics");
      setMetrics(await res.json());
    } catch (e) {
      toast.error("Error fetching metrics");
    }
  };

  const openEditHostModal = (host) => {
    setEditHostForm({
      _id: host._id,
      email: host.email || "",
      fullname: host.fullname || "",
      username: host.username || "",
      password: "",
      confirmPassword: "",
      role: host.role || "host",
      institute: host.institute || "",
      street: host.street || "",
      city: host.city || "",
      pincode: host.pincode || "",
      age: host.age || "",
      course: host.course || "",
      phone: host.phone || "",
      countryCode: host.countryCode || "+91",
    });
    // Reset edit validation state each time the modal opens
    setEditTouched({});
    setEditErrors({});
    setEditHostModal(true);
  };

  const saveEditHost = async () => {
    try {
      setSavingHost(true);
      // Client-side validation for update
      const requiredFields = ["fullname", "username", "email", "institute", "street", "city", "pincode", "age", "course", "phone"]; 
      for (const f of requiredFields) {
        const v = (editHostForm[f] ?? "").toString().trim();
        if (!v) { toast.error(`Missing required field: ${f}`); setSavingHost(false); return; }
      }
      // Specific validations
      if (!/\S+@\S+\.\S+/.test(editHostForm.email)) { toast.error("Invalid email format"); setSavingHost(false); return; }
      if (!/^\d{6}$/.test(String(editHostForm.pincode))) { toast.error("Pincode must be 6 digits"); setSavingHost(false); return; }
      if (!/^\d{10}$/.test(String(editHostForm.phone))) { toast.error("Phone must be 10 digits"); setSavingHost(false); return; }
      if (editHostForm.countryCode && !/^\+\d{1,4}$/.test(String(editHostForm.countryCode))) { toast.error("Invalid country code"); setSavingHost(false); return; }
      const ageNum = parseInt(editHostForm.age, 10); if (isNaN(ageNum) || ageNum < 16 || ageNum > 100) { toast.error("Age must be between 16 and 100"); setSavingHost(false); return; }
      if (editHostForm.password && editHostForm.password !== editHostForm.confirmPassword) { toast.error("Passwords do not match"); setSavingHost(false); return; }
      const token = localStorage.getItem("token");
      const { _id, confirmPassword, ...payload } = editHostForm;
      const res = await fetch(`${config.apiBaseUrl}/api/auth/update/${_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to update host");
      toast.success("✅ Host updated");
      setEditHostModal(false);
      await fetchHosts();
    } catch (e) {
      toast.error("Error updating host");
    } finally {
      setSavingHost(false);
    }
  };

  const handleAddHost = async (e) => {
    e.preventDefault();
    
    // Validate all fields
    const errors = {};
    Object.keys(newHost).forEach(field => {
      if (field !== "role") { // Skip role validation
        const error = validateField(field, newHost[field]);
        if (error) errors[field] = error;
      }
    });

    if (Object.keys(errors).length > 0) {
      setHostErrors(errors);
      setTouchedFields(Object.keys(newHost).reduce((acc, field) => ({ ...acc, [field]: true }), {}));
      toast.error("❌ Please fix the form errors");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      
      if (isEditMode) {
        // Update existing host
        const response = await fetch(`${config.apiBaseUrl}/api/auth/update/${editingHostId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(newHost)
        });

        if (!response.ok) throw new Error("Failed to update host");
        toast.success("✅ Host updated successfully!");
      } else {
        // Add new host
        const response = await fetch(`${config.apiBaseUrl}/api/auth/register`, {
          method: "POST",
          body: JSON.stringify(newHost),
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
        });

        if (!response.ok) throw new Error("MongoDB host creation failed");
        toast.success("✅ New host added!");
      }
      
      // Reset form and exit edit mode
      setNewHost({
        email: "", fullname: "", username: "", password: "", confirmPassword: "", role: "host",
        institute: "", street: "", city: "", pincode: "",
        age: "", course: "", phone: "", countryCode: "+91", institutionType: ""
      });
      setHostErrors({});
      setTouchedFields({});
      setIsEditMode(false);
      setEditingHostId(null);
      
      fetchHosts();
    } catch (error) {
      toast.error(isEditMode ? "Error updating host" : "Error adding host");
    } finally {
      setLoading(false);
    }
  };

  const handleEditHost = (host) => {
    // Set the form to edit mode
    setNewHost({
      ...host,
      password: "" // Clear password for security
    });
    setIsEditMode(true);
    setEditingHostId(host._id);
    setActiveTab("add-host");
    toast.info("Edit mode: Update the fields and click 'Update Host'");
  };

  const handleUpdateHost = async (hostId, updatedData) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${config.apiBaseUrl}/api/auth/update/${hostId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(updatedData)
      });

      if (!response.ok) throw new Error("Failed to update host");
      
      toast.success("✅ Host updated successfully!");
      fetchHosts();
    } catch (error) {
      toast.error("Error updating host: " + error.message);
    }
  };

  const handleDeleteHost = async (hostId) => {
    if (!window.confirm("Are you sure you want to delete this host? This action cannot be undone.")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${config.apiBaseUrl}/api/auth/delete/${hostId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error("Failed to delete host");
      
      toast.success("✅ Host deleted successfully!");
      fetchHosts();
    } catch (error) {
      toast.error("Error deleting host: " + error.message);
    }
  };

  // Derive approved hosts from applications and filter by search term
  // Use users collection hosts (User role==host) list for View Hosts table
  const filteredHosts = hosts.filter(host => 
    host.fullname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    host.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    host.institute?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    host.course?.toLowerCase().includes(searchTerm.toLowerCase())
  );



  if (checkingAdmin) {
    return (
      <div className="flex items-center justify-center h-screen text-white text-xl">
        Checking admin status...
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="flex min-h-screen bg-gradient-to-r from-gray-900 via-gray-800 to-black text-white">
      {/* Sidebar */}
      <div className="w-72 bg-gray-900 p-6 flex flex-col gap-4 shadow-2xl border-r border-gray-700">
        <h2 className="text-3xl font-bold mb-6 text-center animate-pulse">
          ⚙️ Admin Panel
        </h2>

        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-300 ${
            activeTab === "dashboard"
              ? "bg-blue-600 scale-105 shadow-lg"
              : "hover:bg-gray-700"
          }`}
        >
          <BarChart2 size={20} /> Dashboard
        </button>

        <button
          onClick={() => setActiveTab("view-hosts")}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-300 ${
            activeTab === "view-hosts"
              ? "bg-green-600 scale-105 shadow-lg"
              : "hover:bg-gray-700"
          }`}
        >
          <Eye size={20} /> View Hosts
        </button>

        <button
          onClick={() => setActiveTab("host-applications")}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-300 ${
            activeTab === "host-applications"
              ? "bg-orange-600 scale-105 shadow-lg"
              : "hover:bg-gray-700"
          }`}
        >
          <UserPlus size={20} /> Host Applications
        </button>

        <button
          onClick={() => setActiveTab("verify-students")}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-300 ${
            activeTab === "verify-students" ? "bg-teal-600 scale-105 shadow-lg" : "hover:bg-gray-700"
          }`}
        >
          <CheckCircle2 size={20} /> Verify Students
        </button>

        <button
          onClick={() => setActiveTab("events")}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-300 ${
            activeTab === "events"
              ? "bg-green-600 scale-105 shadow-lg"
              : "hover:bg-gray-700"
          }`}
        >
          <Calendar size={20} /> Manage Events
        </button>

        <button
          onClick={() => setActiveTab("monitor")}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-300 ${
            activeTab === "monitor"
              ? "bg-purple-600 scale-105 shadow-lg"
              : "hover:bg-gray-700"
          }`}
        >
          <BarChart2 size={20} /> Monitor Activity
        </button>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-300 mt-auto bg-red-600 hover:bg-red-700"
        >
          Logout
        </button>
      </div>

      {/* Main */}
      <div className="flex-1 p-10 overflow-y-auto">
        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <div className="animate-fadeIn">
            <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
              <BarChart2 size={28} /> Admin Dashboard
            </h1>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gray-800 rounded-xl p-6 shadow-xl admin-card animate-scaleIn">
                <div className="flex items-center gap-3 mb-4">
                  <Users size={24} className="text-blue-400" />
                  <h3 className="text-lg font-semibold">Total Hosts</h3>
                </div>
                <p className="text-3xl font-bold text-blue-400">{hosts.length}</p>
              </div>
              
              <div className="bg-gray-800 rounded-xl p-6 shadow-xl admin-card animate-scaleIn" style={{animationDelay: '0.1s'}}>
                <div className="flex items-center gap-3 mb-4">
                  <Calendar size={24} className="text-green-400" />
                  <h3 className="text-lg font-semibold">Events</h3>
                </div>
                <p className="text-3xl font-bold text-green-400">{metrics ? metrics.events.total : 0}</p>
              </div>
              
              <div className="bg-gray-800 rounded-xl p-6 shadow-xl admin-card animate-scaleIn" style={{animationDelay: '0.2s'}}>
                <div className="flex items-center gap-3 mb-4">
                  <BarChart2 size={24} className="text-purple-400" />
                  <h3 className="text-lg font-semibold">Registrations</h3>
                </div>
                <p className="text-3xl font-bold text-purple-400">{metrics ? metrics.registrations?.total : 0}</p>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
              <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setActiveTab("add-host")}
                  className="flex items-center gap-3 p-4 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <UserPlus size={20} />
                  Add New Host
                </button>
                <button
                  onClick={() => setActiveTab("view-hosts")}
                  className="flex items-center gap-3 p-4 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                >
                  <Eye size={20} />
                  View All Hosts
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "verify-students" && (
          <div className="animate-fadeIn">
            <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
              <CheckCircle2 size={28} /> Verify Students
            </h1>
            <div className="bg-gray-800 rounded-xl p-6 shadow-xl border border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Pending Submissions ({verifyItems.length})</h2>
                <button
                  onClick={fetchPendingVerifications}
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded"
                  disabled={verifyLoading}
                >
                  {verifyLoading ? "Refreshing..." : "Refresh"}
                </button>
              </div>
              {verifyError && (
                <div className="mb-4 p-3 bg-red-900/40 border border-red-700 rounded text-red-200">{verifyError}</div>
              )}
              {verifyItems.length === 0 && !verifyLoading ? (
                <div className="text-gray-400">No pending submissions.</div>
              ) : (
                <div className="space-y-4">
                  {verifyItems.map(u => {
                    const id = u._id || u.id;
                    const toUrl = (p) => {
                      if (!p) return "";
                      const idx = String(p).lastIndexOf("uploads");
                      const rel = idx >= 0 ? String(p).slice(idx).replace(/\\\\/g, "/") : String(p).replace(/\\\\/g, "/");
                      return `${config.apiBaseUrl}/${rel}`;
                    };
                    const studentIdUrl = toUrl(u.studentIdPath);
                    const secondDocUrl = toUrl(u.secondDocPath);
                    return (
                      <div key={id} className="bg-gray-800/60 border border-gray-700 rounded p-4">
                        <div className="flex flex-wrap justify-between gap-3">
                          <div>
                            <div className="font-semibold text-lg">{u.fullname}</div>
                            <div className="text-gray-400 text-sm">{u.institute}</div>
                            <div className="text-gray-500 text-sm">{u.email} {u.phone ? `• ${u.phone}` : ""}</div>
                            {u.ocrMismatch ? (
                              <div className="mt-1 inline-block text-xs px-2 py-1 rounded bg-yellow-900/40 border border-yellow-700 text-yellow-200">OCR mismatch flagged</div>
                            ) : null}
                          </div>
                          <div className="flex gap-3 items-start">
                            {studentIdUrl ? (
                              <a href={studentIdUrl} target="_blank" rel="noreferrer" className="block">
                                <img src={studentIdUrl} alt="Student ID" className="w-24 h-24 object-cover rounded border border-gray-600" onError={(e)=>{ e.currentTarget.style.display='none'; }} />
                                <div className="text-xs text-blue-300 hover:underline mt-1">Open ID</div>
                              </a>
                            ) : (
                              <div className="text-xs text-gray-500">No ID file</div>
                            )}
                            {secondDocUrl ? (
                              <a href={secondDocUrl} target="_blank" rel="noreferrer" className="block">
                                <img src={secondDocUrl} alt="Second Doc" className="w-24 h-24 object-cover rounded border border-gray-600" onError={(e)=>{ e.currentTarget.style.display='none'; }} />
                                <div className="text-xs text-blue-300 hover:underline mt-1">Open Doc</div>
                              </a>
                            ) : (
                              <div className="text-xs text-gray-500">No second doc</div>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 flex flex-col md:flex-row gap-2 md:items-center">
                          <input
                            className="flex-1 p-2 rounded bg-gray-900 border border-gray-700"
                            placeholder="Reason (for rejection)"
                            value={reasonById[id] || ""}
                            onChange={(e)=> setReasonById(prev=> ({ ...prev, [id]: e.target.value }))}
                          />
                          <div className="flex gap-2">
                            <button className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded" onClick={()=> approveVerification(id)}>Approve</button>
                            <button className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded" onClick={()=> rejectVerification(id)}>Reject</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* View Hosts Tab */}
        {activeTab === "view-hosts" && (
          <div className="animate-fadeIn">
            <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
              <Eye size={28} /> View Hosts
            </h1>
            
            <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">All Hosts ({filteredHosts.length})</h2>
                <div className="flex gap-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search hosts..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="px-4 py-2 pr-10 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm("")}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-700 text-gray-300">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Institute</th>
                      <th className="px-4 py-3">Course</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-300">
                    {filteredHosts.map((host) => (
                      <tr key={host._id} className="border-b border-gray-700 hover:bg-gray-700 table-row">
                        <td className="px-4 py-3">{host.fullname}</td>
                        <td className="px-4 py-3">{host.email}</td>
                        <td className="px-4 py-3">{host.institute}</td>
                        <td className="px-4 py-3">{host.course}</td>
                        <td className="px-4 py-3">{host.countryCode} {host.phone}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => openEditHostModal(host)}
                              className="p-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteHost(host.userId || host._id)}
                              className="p-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Host Applications Tab */}
        {activeTab === "host-applications" && (
          <div className="animate-fadeIn">
            <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
              <UserPlus size={28} /> Host Applications
            </h1>

            {loadingApplications ? (
              <div className="text-gray-400 text-center py-8">Loading applications...</div>
            ) : hostApplications.filter(a => a.approvalStatus === "pending").length === 0 ? (
              <div className="text-gray-400 text-center py-8">No host applications found.</div>
            ) : (
              <div className="space-y-4">
                {hostApplications
                  .filter(application => application.approvalStatus === "pending")
                  .map((application) => (
                  <div key={application._id} className="bg-gray-800 rounded-xl p-6 shadow-xl border border-gray-700">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-white">{application.fullname}</h3>
                        <p className="text-gray-400">{application.email}</p>
                        <p className="text-gray-400">{application.institute}</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        application.approvalStatus === "pending" 
                          ? "bg-yellow-600 text-yellow-100" 
                          : application.approvalStatus === "approved"
                          ? "bg-green-600 text-green-100"
                          : "bg-red-600 text-red-100"
                      }`}>
                        {application.approvalStatus.charAt(0).toUpperCase() + application.approvalStatus.slice(1)}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="text-sm text-gray-400">Department</label>
                        <p className="text-white">{application.course}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-400">Phone</label>
                        <p className="text-white">{application.countryCode} {application.phone}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-400">Address</label>
                        <p className="text-white">{application.street}, {application.city} - {application.pincode}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-400">Applied On</label>
                        <p className="text-white">{new Date(application.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>

                    {application.documentPath && (
                      <div className="mb-4">
                        <label className="text-sm text-gray-400">Document</label>
                        <div className="mt-1">
                          <a 
                            href={`${config.apiBaseUrl}/${application.documentPath}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline"
                          >
                            View Document
                          </a>
                        </div>
                      </div>
                    )}

                    {application.rejectionReason && (
                      <div className="mb-4 p-3 bg-red-900/30 border border-red-600 rounded-lg">
                        <label className="text-sm text-red-400">Rejection Reason</label>
                        <p className="text-red-200">{application.rejectionReason}</p>
                      </div>
                    )}

                    {application.approvalStatus === "pending" && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => approveHostApplication(application._id)}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-all"
                        >
                          <CheckCircle2 size={16} />
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            const reason = prompt("Enter rejection reason:");
                            if (reason) {
                              rejectHostApplication(application._id, reason);
                            }
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-all"
                        >
                          <XCircle size={16} />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        
{activeTab === "add-host" && (
          <div className="animate-fadeIn">
            <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
              <UserPlus size={28} /> Add New Host
            </h1>
            <form onSubmit={handleAddHost} className="bg-gray-800 rounded-xl p-6 shadow-xl space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    placeholder="Institution email address"
                    value={newHost.email}
                    onChange={(e) => handleHostFieldChange("email", e.target.value)}
                    onFocus={() => handleHostFieldFocus("email")}
                    onBlur={() => handleHostFieldBlur("email")}
                    className={`w-full p-3 rounded-lg bg-gray-700 focus:ring-2 focus:ring-blue-500 border ${
                      hostErrors.email ? 'border-red-500' : 'border-gray-600'
                    }`}
                    required
                  />
                  {hostErrors.email && (
                    <p className="text-red-400 text-sm mt-1">{hostErrors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Institution Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., ABC College of Engineering"
                    value={newHost.institute}
                    onChange={(e) => handleHostFieldChange("institute", e.target.value)}
                    onFocus={() => handleHostFieldFocus("institute")}
                    onBlur={() => handleHostFieldBlur("institute")}
                    className={`w-full p-3 rounded-lg bg-gray-700 focus:ring-2 focus:ring-blue-500 border ${
                      hostErrors.institute ? 'border-red-500' : 'border-gray-600'
                    }`}
                    required
                  />
                  {hostErrors.institute && (
                    <p className="text-red-400 text-sm mt-1">{hostErrors.institute}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Department *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Computer Science Department"
                    value={newHost.course}
                    onChange={(e) => handleHostFieldChange("course", e.target.value)}
                    onFocus={() => handleHostFieldFocus("course")}
                    onBlur={() => handleHostFieldBlur("course")}
                    className={`w-full p-3 rounded-lg bg-gray-700 focus:ring-2 focus:ring-blue-500 border ${
                      hostErrors.course ? 'border-red-500' : 'border-gray-600'
                    }`}
                    required
                  />
                  {hostErrors.course && (
                    <p className="text-red-400 text-sm mt-1">{hostErrors.course}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Institution Type (optional)
                  </label>
                  <select
                    value={newHost.institutionType}
                    onChange={(e) => handleHostFieldChange("institutionType", e.target.value)}
                    className="w-full p-3 rounded-lg bg-gray-700 focus:ring-2 focus:ring-blue-500 border border-gray-600"
                  >
                    <option value="">Select type</option>
                    <option value="College">College</option>
                    <option value="University">University</option>
                    <option value="Institute">Institute</option>
                    <option value="Company">Company</option>
                    <option value="NGO">NGO</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Contact Person Name *
                  </label>
                  <input
                    type="text"
                    placeholder="Primary contact full name"
                    value={newHost.fullname}
                    onChange={(e) => handleHostFieldChange("fullname", e.target.value)}
                    onFocus={() => handleHostFieldFocus("fullname")}
                    onBlur={() => handleHostFieldBlur("fullname")}
                    className={`w-full p-3 rounded-lg bg-gray-700 focus:ring-2 focus:ring-blue-500 border ${
                      hostErrors.fullname ? 'border-red-500' : 'border-gray-600'
                    }`}
                    required
                  />
                  {hostErrors.fullname && (
                    <p className="text-red-400 text-sm mt-1">{hostErrors.fullname}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Contact Person Username *
                  </label>
                  <input
                    type="text"
                    placeholder="Create username for contact person"
                    value={newHost.username}
                    onChange={(e) => handleHostFieldChange("username", e.target.value)}
                    onFocus={() => handleHostFieldFocus("username")}
                    onBlur={() => handleHostFieldBlur("username")}
                    className={`w-full p-3 rounded-lg bg-gray-700 focus:ring-2 focus:ring-blue-500 border ${
                      hostErrors.username ? 'border-red-500' : 'border-gray-600'
                    }`}
                    required
                  />
                  {hostErrors.username && (
                    <p className="text-red-400 text-sm mt-1">{hostErrors.username}</p>
                  )}
                </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password *
                </label>
                <input
                  type="password"
                  placeholder="Create a password"
                  value={newHost.password}
                  onChange={(e) => handleHostFieldChange("password", e.target.value)}
                  onFocus={() => handleHostFieldFocus("password")}
                  onBlur={() => handleHostFieldBlur("password")}
                  className={`w-full p-3 rounded-lg bg-gray-700 focus:ring-2 focus:ring-blue-500 border ${
                    hostErrors.password ? 'border-red-500' : 'border-gray-600'
                  }`}
                  required
                />
                {hostErrors.password && (
                  <p className="text-red-400 text-sm mt-1">{hostErrors.password}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  placeholder="Confirm the password"
                  value={newHost.confirmPassword}
                  onChange={(e) => handleHostFieldChange("confirmPassword", e.target.value)}
                  onFocus={() => handleHostFieldFocus("confirmPassword")}
                  onBlur={() => handleHostFieldBlur("confirmPassword")}
                  className={`w-full p-3 rounded-lg bg-gray-700 focus:ring-2 focus:ring-blue-500 border ${
                    hostErrors.confirmPassword ? 'border-red-500' : 'border-gray-600'
                  }`}
                  required
                />
                {hostErrors.confirmPassword && (
                  <p className="text-red-400 text-sm mt-1">{hostErrors.confirmPassword}</p>
                )}
              </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Contact Person Age *
                  </label>
                  <input
                    type="number"
                    placeholder="e.g., 30"
                    value={newHost.age}
                    onChange={(e) => handleHostFieldChange("age", e.target.value)}
                    onFocus={() => handleHostFieldFocus("age")}
                    onBlur={() => handleHostFieldBlur("age")}
                    className={`w-full p-3 rounded-lg bg-gray-700 focus:ring-2 focus:ring-blue-500 border ${
                      hostErrors.age ? 'border-red-500' : 'border-gray-600'
                    }`}
                    min="16"
                    max="100"
                    required
                  />
                  {hostErrors.age && (
                    <p className="text-red-400 text-sm mt-1">{hostErrors.age}</p>
                  )}
                </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Country Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., +91"
                    value={newHost.countryCode}
                    onChange={(e) => handleHostFieldChange("countryCode", e.target.value)}
                    onFocus={() => handleHostFieldFocus("countryCode")}
                    onBlur={() => handleHostFieldBlur("countryCode")}
                    className={`w-full p-3 rounded-lg bg-gray-700 focus:ring-2 focus:ring-blue-500 border ${
                      hostErrors.countryCode ? 'border-red-500' : 'border-gray-600'
                    }`}
                  />
                  {hostErrors.countryCode && (
                    <p className="text-red-400 text-sm mt-1">{hostErrors.countryCode}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Institution Phone Number *
                  </label>
                  <input
                    type="tel"
                    placeholder="Institution main contact number"
                    value={newHost.phone}
                    onChange={(e) => handleHostFieldChange("phone", e.target.value)}
                    onFocus={() => handleHostFieldFocus("phone")}
                    onBlur={() => handleHostFieldBlur("phone")}
                    className={`w-full p-3 rounded-lg bg-gray-700 focus:ring-2 focus:ring-blue-500 border ${
                      hostErrors.phone ? 'border-red-500' : 'border-gray-600'
                    }`}
                    required
                  />
                  {hostErrors.phone && (
                    <p className="text-red-400 text-sm mt-1">{hostErrors.phone}</p>
                  )}
                </div>
              </div>

              {/* Address Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 123, College Road"
                    value={newHost.street}
                    onChange={(e) => handleHostFieldChange("street", e.target.value)}
                    onFocus={() => handleHostFieldFocus("street")}
                    onBlur={() => handleHostFieldBlur("street")}
                    className={`w-full p-3 rounded-lg bg-gray-700 focus:ring-2 focus:ring-blue-500 border ${
                      hostErrors.street ? 'border-red-500' : 'border-gray-600'
                    }`}
                    required
                  />
                  {hostErrors.street && (
                    <p className="text-red-400 text-sm mt-1">{hostErrors.street}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Chennai"
                    value={newHost.city}
                    onChange={(e) => handleHostFieldChange("city", e.target.value)}
                    onFocus={() => handleHostFieldFocus("city")}
                    onBlur={() => handleHostFieldBlur("city")}
                    className={`w-full p-3 rounded-lg bg-gray-700 focus:ring-2 focus:ring-blue-500 border ${
                      hostErrors.city ? 'border-red-500' : 'border-gray-600'
                    }`}
                    required
                  />
                  {hostErrors.city && (
                    <p className="text-red-400 text-sm mt-1">{hostErrors.city}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Pincode *
                  </label>
                  <input
                    type="text"
                    placeholder="6-digit pincode"
                    value={newHost.pincode}
                    onChange={(e) => handleHostFieldChange("pincode", e.target.value)}
                    onBlur={() => handleHostFieldBlur("pincode")}
                    className={`w-full p-3 rounded-lg bg-gray-700 focus:ring-2 focus:ring-blue-500 border ${
                      hostErrors.pincode ? 'border-red-500' : 'border-gray-600'
                    }`}
                    maxLength="6"
                    required
                  />
                  {hostErrors.pincode && (
                    <p className="text-red-400 text-sm mt-1">{hostErrors.pincode}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 py-3 rounded-lg font-semibold transition-all"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {isEditMode ? "Updating..." : "Adding Host..."}
                    </div>
                  ) : (
                    isEditMode ? "Update Host" : "Add Host"
                  )}
                </button>
                
                {isEditMode && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditMode(false);
                      setEditingHostId(null);
                      setNewHost({
                        email: "", fullname: "", username: "", password: "", confirmPassword: "", role: "host",
                        institute: "", street: "", city: "", pincode: "",
                        age: "", course: "", phone: "", countryCode: "+91", institutionType: ""
                      });
                      setHostErrors({});
                      setTouchedFields({});
                    }}
                    className="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg font-semibold transition-all"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            
          </div>
        )}

        

        {activeTab === "events" && (
          <div className="animate-fadeIn">
            <h1 className="text-3xl font-bold mb-4 flex items-center gap-2">
              <Calendar size={28} /> Manage Events
            </h1>
            <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
              {loadingEvents ? (
                <div className="text-gray-400">Loading events...</div>
              ) : adminEvents.length === 0 ? (
                <div className="text-gray-400">No events found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-700 text-gray-300">
                      <tr>
                        <th className="px-4 py-3">Title</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">City</th>
                        <th className="px-4 py-3">Published</th>
                        <th className="px-4 py-3">Completed</th>
                        <th className="px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-300">
                      {adminEvents.map((ev) => (
                        <tr key={ev._id} className="border-b border-gray-700 hover:bg-gray-700 table-row">
                          <td className="px-4 py-3">{ev.title}</td>
                          <td className="px-4 py-3">{new Date(ev.date).toLocaleString()}</td>
                          <td className="px-4 py-3">{ev.city || "-"}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={async () => {
                                try {
                                  const token = localStorage.getItem("token");
                                  const res = await fetch(`${config.apiBaseUrl}/api/auth/admin/events/${ev._id}`, {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                                    body: JSON.stringify({ isPublished: !ev.isPublished })
                                  });
                                  if (!res.ok) throw new Error("Failed");
                                  toast.success(!ev.isPublished ? "Published" : "Unpublished");
                                  fetchAdminEvents();
                                } catch (_) {
                                  toast.error("Toggle publish failed");
                                }
                              }}
                              className="p-2 bg-gray-700 rounded hover:bg-gray-600"
                              title={ev.isPublished ? "Unpublish" : "Publish"}
                            >
                              {ev.isPublished ? <ToggleRight size={18} className="text-green-400" /> : <ToggleLeft size={18} className="text-gray-400" />}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={async () => {
                                try {
                                  const token = localStorage.getItem("token");
                                  const res = await fetch(`${config.apiBaseUrl}/api/auth/admin/events/${ev._id}`, {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                                    body: JSON.stringify({ isCompleted: !ev.isCompleted })
                                  });
                                  if (!res.ok) throw new Error("Failed");
                                  toast.success(!ev.isCompleted ? "Marked completed" : "Marked active");
                                  fetchAdminEvents();
                                } catch (_) {
                                  toast.error("Toggle complete failed");
                                }
                              }}
                              className="p-2 bg-gray-700 rounded hover:bg-gray-600"
                              title={ev.isCompleted ? "Mark active" : "Mark completed"}
                            >
                              {ev.isCompleted ? <CheckCircle2 size={18} className="text-green-400" /> : <XCircle size={18} className="text-gray-400" />}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={async () => {
                                  if (!window.confirm("Delete this event?")) return;
                                  try {
                                    const token = localStorage.getItem("token");
                                    const res = await fetch(`${config.apiBaseUrl}/api/auth/admin/events/${ev._id}`, {
                                      method: "DELETE",
                                      headers: { "Authorization": `Bearer ${token}` }
                                    });
                                    if (!res.ok) throw new Error("Failed");
                                    toast.success("Event deleted");
                                    setAdminEvents((prev) => prev.filter((e) => e._id !== ev._id));
                                  } catch (_) {
                                    toast.error("Delete failed");
                                  }
                                }}
                                className="p-2 bg-red-600 hover:bg-red-700 rounded"
                                title="Delete Event"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "monitor" && (
          <div className="animate-fadeIn">
            <h1 className="text-3xl font-bold mb-4 flex items-center gap-2">
              <BarChart2 size={28} /> Monitor Activity & Feedback
            </h1>
            {!metrics ? (
              <div className="text-gray-400">Loading metrics...</div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
                    <h3 className="text-sm text-gray-400 mb-2">Users</h3>
                    <p className="text-2xl font-bold">{metrics.users.total} total</p>
                    <p className="text-sm text-gray-400">{metrics.users.hosts} hosts • {metrics.users.students} students • {metrics.users.admins} admins</p>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
                    <h3 className="text-sm text-gray-400 mb-2">Events</h3>
                    <p className="text-2xl font-bold">{metrics.events.total} total</p>
                    <p className="text-sm text-gray-400">{metrics.events.published} published • {metrics.events.completed} completed</p>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
                    <h3 className="text-sm text-gray-400 mb-2">Recent Activity</h3>
                    <p className="text-sm text-gray-400">Last 10 events, registrations, feedbacks</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
                    <h3 className="text-lg font-semibold mb-3">Recent Events</h3>
                    <ul className="space-y-2 text-sm text-gray-300">
                      {metrics.recent.events.map((e) => (
                        <li key={e._id} className="flex justify-between">
                          <span className="truncate mr-2">{e.title}</span>
                          <span className="text-gray-500">{new Date(e.createdAt).toLocaleDateString()}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
                    <h3 className="text-lg font-semibold mb-3">Recent Registrations</h3>
                    <ul className="space-y-2 text-sm text-gray-300">
                      {metrics.recent.registrations.map((r, idx) => (
                        <li key={idx} className="flex justify-between">
                          <span className="truncate mr-2">{r.title}</span>
                          <span className="text-gray-500">{new Date(r.registeredAt).toLocaleDateString()}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
                    <h3 className="text-lg font-semibold mb-3">Recent Feedback</h3>
                    <ul className="space-y-2 text-sm text-gray-300">
                      {metrics.recent.feedbacks.map((f, idx) => (
                        <li key={idx} className="flex justify-between">
                          <span className="truncate mr-2">{f.title} • {f.rating}★</span>
                          <span className="text-gray-500">{new Date(f.createdAt).toLocaleDateString()}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {editHostModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl border border-gray-700 max-h-[85vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">Edit Host</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Full Name</label>
                <input
                  className={`w-full p-3 rounded bg-gray-700 border ${editErrors.fullname ? 'border-red-600' : 'border-gray-600'}`}
                  value={editHostForm.fullname}
                  onFocus={() => handleEditFieldFocus('fullname')}
                  onChange={(e)=>handleEditFieldChange('fullname', e.target.value)}
                />
                {editErrors.fullname && <p className="text-red-400 text-xs mt-1">{editErrors.fullname}</p>}
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Username</label>
                <input
                  className={`w-full p-3 rounded bg-gray-700 border ${editErrors.username ? 'border-red-600' : 'border-gray-600'}`}
                  value={editHostForm.username}
                  onFocus={() => handleEditFieldFocus('username')}
                  onChange={(e)=>handleEditFieldChange('username', e.target.value)}
                />
                {editErrors.username && <p className="text-red-400 text-xs mt-1">{editErrors.username}</p>}
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  className={`w-full p-3 rounded bg-gray-700 border ${editErrors.email ? 'border-red-600' : 'border-gray-600'}`}
                  value={editHostForm.email}
                  onFocus={() => handleEditFieldFocus('email')}
                  onChange={(e)=>handleEditFieldChange('email', e.target.value)}
                />
                {editErrors.email && <p className="text-red-400 text-xs mt-1">{editErrors.email}</p>}
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Phone</label>
                <input
                  className={`w-full p-3 rounded bg-gray-700 border ${editErrors.phone ? 'border-red-600' : 'border-gray-600'}`}
                  value={editHostForm.phone}
                  onFocus={() => handleEditFieldFocus('phone')}
                  onChange={(e)=>handleEditFieldChange('phone', e.target.value)}
                />
                {editErrors.phone && <p className="text-red-400 text-xs mt-1">{editErrors.phone}</p>}
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Country Code</label>
                <input
                  className={`w-full p-3 rounded bg-gray-700 border ${editErrors.countryCode ? 'border-red-600' : 'border-gray-600'}`}
                  value={editHostForm.countryCode}
                  onFocus={() => handleEditFieldFocus('countryCode')}
                  onChange={(e)=>handleEditFieldChange('countryCode', e.target.value)}
                />
                {editErrors.countryCode && <p className="text-red-400 text-xs mt-1">{editErrors.countryCode}</p>}
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Institute</label>
                <input
                  className={`w-full p-3 rounded bg-gray-700 border ${editErrors.institute ? 'border-red-600' : 'border-gray-600'}`}
                  value={editHostForm.institute}
                  onFocus={() => handleEditFieldFocus('institute')}
                  onChange={(e)=>handleEditFieldChange('institute', e.target.value)}
                />
                {editErrors.institute && <p className="text-red-400 text-xs mt-1">{editErrors.institute}</p>}
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Course/Department</label>
                <input
                  className={`w-full p-3 rounded bg-gray-700 border ${editErrors.course ? 'border-red-600' : 'border-gray-600'}`}
                  value={editHostForm.course}
                  onFocus={() => handleEditFieldFocus('course')}
                  onChange={(e)=>handleEditFieldChange('course', e.target.value)}
                />
                {editErrors.course && <p className="text-red-400 text-xs mt-1">{editErrors.course}</p>}
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Age</label>
                <input
                  type="number"
                  className={`w-full p-3 rounded bg-gray-700 border ${editErrors.age ? 'border-red-600' : 'border-gray-600'}`}
                  value={editHostForm.age}
                  onFocus={() => handleEditFieldFocus('age')}
                  onChange={(e)=>handleEditFieldChange('age', e.target.value)}
                />
                {editErrors.age && <p className="text-red-400 text-xs mt-1">{editErrors.age}</p>}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-300 mb-1">Street</label>
                <input
                  className={`w-full p-3 rounded bg-gray-700 border ${editErrors.street ? 'border-red-600' : 'border-gray-600'}`}
                  value={editHostForm.street}
                  onFocus={() => handleEditFieldFocus('street')}
                  onChange={(e)=>handleEditFieldChange('street', e.target.value)}
                />
                {editErrors.street && <p className="text-red-400 text-xs mt-1">{editErrors.street}</p>}
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">City</label>
                <input
                  className={`w-full p-3 rounded bg-gray-700 border ${editErrors.city ? 'border-red-600' : 'border-gray-600'}`}
                  value={editHostForm.city}
                  onFocus={() => handleEditFieldFocus('city')}
                  onChange={(e)=>handleEditFieldChange('city', e.target.value)}
                />
                {editErrors.city && <p className="text-red-400 text-xs mt-1">{editErrors.city}</p>}
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Pincode</label>
                <input
                  className={`w-full p-3 rounded bg-gray-700 border ${editErrors.pincode ? 'border-red-600' : 'border-gray-600'}`}
                  value={editHostForm.pincode}
                  onFocus={() => handleEditFieldFocus('pincode')}
                  onChange={(e)=>handleEditFieldChange('pincode', e.target.value)}
                />
                {editErrors.pincode && <p className="text-red-400 text-xs mt-1">{editErrors.pincode}</p>}
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">New Password (optional)</label>
                <input
                  type="password"
                  className={`w-full p-3 rounded bg-gray-700 border ${editErrors.password ? 'border-red-600' : 'border-gray-600'}`}
                  value={editHostForm.password}
                  onFocus={() => handleEditFieldFocus('password')}
                  onChange={(e)=>handleEditFieldChange('password', e.target.value)}
                />
                {editErrors.password && <p className="text-red-400 text-xs mt-1">{editErrors.password}</p>}
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Confirm Password</label>
                <input
                  type="password"
                  className={`w-full p-3 rounded bg-gray-700 border ${editErrors.confirmPassword ? 'border-red-600' : 'border-gray-600'}`}
                  value={editHostForm.confirmPassword}
                  onFocus={() => handleEditFieldFocus('confirmPassword')}
                  onChange={(e)=>handleEditFieldChange('confirmPassword', e.target.value)}
                />
                {editErrors.confirmPassword && <p className="text-red-400 text-xs mt-1">{editErrors.confirmPassword}</p>}
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={()=>setEditHostModal(false)} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded">Cancel</button>
              <button disabled={savingHost} onClick={saveEditHost} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded">
                {savingHost ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}