// src/components/AdminPanel.jsx
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
// Firebase removed
import { useNavigate } from "react-router-dom";
import { Users, Calendar, BarChart2, UserPlus, Trash2, Edit3, LogOut, Eye, Settings } from "lucide-react";
import config from "../config";

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  const [hosts, setHosts] = useState([]);
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

    // prevent back after logout
    window.history.pushState(null, "", window.location.href);
    window.onpopstate = () => window.history.go(1);
  }, []);

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

  // Filter hosts based on search term
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
          onClick={() => setActiveTab("add-host")}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-300 ${
            activeTab === "add-host"
              ? "bg-purple-600 scale-105 shadow-lg"
              : "hover:bg-gray-700"
          }`}
        >
          <UserPlus size={20} /> Add Host
        </button>

        <button
          onClick={() => setActiveTab("manage-hosts")}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-300 ${
            activeTab === "manage-hosts"
              ? "bg-orange-600 scale-105 shadow-lg"
              : "hover:bg-gray-700"
          }`}
        >
          <Settings size={20} /> Manage Hosts
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
                  <h3 className="text-lg font-semibold">Active Events</h3>
                </div>
                <p className="text-3xl font-bold text-green-400">0</p>
              </div>
              
              <div className="bg-gray-800 rounded-xl p-6 shadow-xl admin-card animate-scaleIn" style={{animationDelay: '0.2s'}}>
                <div className="flex items-center gap-3 mb-4">
                  <BarChart2 size={24} className="text-purple-400" />
                  <h3 className="text-lg font-semibold">System Status</h3>
                </div>
                <p className="text-3xl font-bold text-purple-400">Online</p>
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

        {/* View Hosts Tab */}
        {activeTab === "view-hosts" && (
          <div className="animate-fadeIn">
            <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
              <Eye size={28} /> View Hosts
            </h1>
            
            <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">All Hosts ({filteredHosts.length} of {hosts.length})</h2>
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
                              onClick={() => handleEditHost(host)}
                              className="p-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteHost(host._id)}
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

        {/* Add Host Tab */}
        {activeTab === "add-host" && (
          <div className="animate-fadeIn">
            <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
              <UserPlus size={28} /> Add New Host
            </h1>

            {/* Add Host */}
            <form
              onSubmit={handleAddHost}
              className="bg-gray-800 rounded-xl p-6 shadow-xl space-y-4 max-w-2xl"
            >
                          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
              <UserPlus size={20} /> {isEditMode ? 'Edit Host' : 'Add New Host'}
            </h2>
              
              {/* Personal Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    placeholder="Institution email address"
                    value={newHost.email}
                    onChange={(e) => handleHostFieldChange("email", e.target.value)}
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

            {/* Host List */}
            <div className="mt-10">
              <h2 className="text-2xl font-semibold mb-4">Current Hosts</h2>
              {hosts.length === 0 ? (
                <p className="text-gray-400">No hosts found</p>
              ) : (
                                 <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {hosts.map((host) => (
                     <div
                       key={host._id}
                       className="bg-gray-800 p-6 rounded-xl shadow-lg hover:scale-[1.02] transition-transform"
                     >
                       {/* Basic Info */}
                       <div className="mb-4">
                         <h3 className="text-lg font-semibold text-white mb-2">
                           👤 {host.fullname}
                         </h3>
                         <p className="text-gray-300 text-sm">🔑 {host.username}</p>
                         <p className="text-gray-300 text-sm">📧 {host.email}</p>
                         <p className="text-gray-300 text-sm">🎭 Role: {host.role}</p>
                       </div>

                       {/* Academic Info */}
                       {host.institute && (
                         <div className="mb-3 p-3 bg-gray-700 rounded-lg">
                           <p className="text-gray-300 text-sm">
                             <strong>🏫 Institution:</strong> {host.institute}
                           </p>
                           {host.course && (
                             <p className="text-gray-300 text-sm">
                               <strong>📚 Department:</strong> {host.course}
                             </p>
                           )}
                           {host.age && (
                             <p className="text-gray-300 text-sm">
                               <strong>👤 Contact Age:</strong> {host.age}
                             </p>
                           )}
                         </div>
                       )}

                       {/* Contact Info */}
                       {host.phone && (
                         <div className="mb-3 p-3 bg-gray-700 rounded-lg">
                           <p className="text-gray-300 text-sm">
                             <strong>📱 Phone:</strong> {host.countryCode || "+91"} {host.phone}
                           </p>
                         </div>
                       )}

                       {/* Address Info */}
                       {(host.street || host.city || host.pincode) && (
                         <div className="mb-3 p-3 bg-gray-700 rounded-lg">
                           <p className="text-gray-300 text-sm">
                             <strong>📍 Address:</strong>
                           </p>
                           {host.street && (
                             <p className="text-gray-300 text-sm ml-2">{host.street}</p>
                           )}
                           <p className="text-gray-300 text-sm ml-2">
                             {host.city} {host.pincode}
                           </p>
                         </div>
                       )}

                       {/* Action Buttons */}
                       <div className="flex gap-2 mt-4">
                         <button
                           onClick={() =>
                             handleUpdateHost(host._id, {
                               ...host,
                               fullname: host.fullname + " (Updated)",
                             })
                           }
                           className="flex items-center gap-1 bg-yellow-600 hover:bg-yellow-700 px-3 py-2 rounded-lg text-sm transition-colors"
                         >
                           <Edit3 size={16} /> Update
                         </button>
                         <button
                           onClick={() => handleDeleteHost(host._id)}
                           className="flex items-center gap-1 bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg text-sm transition-colors"
                         >
                           <Trash2 size={16} /> Delete
                         </button>
                       </div>
                     </div>
                   ))}
                 </div>
              )}
            </div>
          </div>
        )}

        {/* Manage Hosts Tab */}
        {activeTab === "manage-hosts" && (
          <div className="animate-fadeIn">
            <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
              <Settings size={28} /> Manage Hosts
            </h1>
            
            <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Host Management ({filteredHosts.length} of {hosts.length})</h2>
                <div className="flex gap-4 items-center">
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
                  <button
                    onClick={() => setActiveTab("add-host")}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    <UserPlus size={16} />
                    Add New Host
                  </button>
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
                              onClick={() => handleEditHost(host)}
                              className="p-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                              title="Edit Host"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteHost(host._id)}
                              className="p-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
                              title="Delete Host"
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

        {activeTab === "events" && (
          <div className="animate-fadeIn">
            <h1 className="text-3xl font-bold mb-4 flex items-center gap-2">
              <Calendar size={28} /> Manage Events
            </h1>
            <p className="text-gray-400">Event CRUD goes here</p>
          </div>
        )}

        {activeTab === "monitor" && (
          <div className="animate-fadeIn">
            <h1 className="text-3xl font-bold mb-4 flex items-center gap-2">
              <BarChart2 size={28} /> Monitor Activity & Feedback
            </h1>
            <p className="text-gray-400">Monitoring dashboard goes here</p>
          </div>
        )}
      </div>
    </div>
  );
}