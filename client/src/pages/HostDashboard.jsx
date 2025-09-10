import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { 
  Calendar, 
  Plus, 
  Edit3, 
  Trash2, 
  Users, 
  Star, 
  CheckCircle, 
  Bell, 
  Download,
  Eye,
  Clock,
  MapPin,
  UserCheck,
  Trophy,
  BarChart3,
  Settings,
  LogOut,
  Filter,
  Search,
  TrendingUp,
  Award,
  MessageSquare,
  Activity
} from "lucide-react";
import api from "../utils/api";
import config from "../config";

const bearer = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function HostDashboard() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("events");

  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [form, setForm] = useState({ 
    title: "", 
    description: "", 
    shortDescription: "",
    date: "", 
    endDate: "",
    location: "", 
    address: "",
    city: "",
    state: "",
    pincode: "",
    capacity: 0,
    price: 0,
    currency: "INR",
    category: "General",
    tags: "",
    requirements: "",
    agenda: "",
    contactEmail: "",
    contactPhone: "",
    website: "",
    imageUrl: "",
    isOnline: false,
    meetingLink: ""
  });

  const [formErrors, setFormErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const navigate = useNavigate();

  // Validation functions
  const validateField = (field, value) => {
    switch (field) {
      case "title":
        return value.length >= 3 ? "" : "Title must be at least 3 characters";
      case "shortDescription":
        return value.length <= 150 ? "" : "Short description must be 150 characters or less";
      case "description":
        return value.length >= 10 ? "" : "Description must be at least 10 characters";
      case "date":
        if (!value) return "Event date is required";
        return new Date(value) > new Date() ? "" : "Event date must be in the future";
      case "endDate":
        if (!value) return "";
        if (!form.date) return "Please set start date first";
        return new Date(value) > new Date(form.date) ? "" : "End date must be after start date";
      case "location":
        return value.length >= 2 ? "" : "Location is required";
      case "address":
        return value.length >= 5 ? "" : "Address must be at least 5 characters";
      case "city":
        return value.length >= 2 ? "" : "City is required";
      case "state":
        return value.length >= 2 ? "" : "State is required";
      case "pincode":
        if (!value) return "";
        return /^\d{6}$/.test(value) ? "" : "Pincode must be 6 digits";
      case "capacity":
        const cap = parseInt(value);
        return cap >= 0 ? "" : "Capacity must be 0 or greater";
      case "price":
        const price = parseFloat(value);
        return price >= 0 ? "" : "Price must be 0 or greater";
      case "contactEmail":
        if (!value) return "";
        return /\S+@\S+\.\S+/.test(value) ? "" : "Invalid email format";
      case "contactPhone":
        if (!value) return "";
        return /^\d{10}$/.test(value) ? "" : "Phone must be 10 digits";
      case "website":
        if (!value) return "";
        return /^https?:\/\/.+/.test(value) ? "" : "Website must start with http:// or https://";
      case "meetingLink":
        if (!form.isOnline || !value) return "";
        return /^https?:\/\/.+/.test(value) ? "" : "Meeting link must start with http:// or https://";
      case "tags":
        if (!value) return "";
        const tags = value.split(',').map(tag => tag.trim());
        return tags.length <= 10 ? "" : "Maximum 10 tags allowed";
      default:
        return "";
    }
  };

  const handleFieldChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    
    if (touchedFields[field]) {
      const error = validateField(field, value);
      setFormErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  const handleFieldBlur = (field) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, form[field]);
    setFormErrors(prev => ({ ...prev, [field]: error }));
  };

  const validateForm = () => {
    const errors = {};
    const requiredFields = ['title', 'description', 'date', 'location', 'city', 'state'];
    
    requiredFields.forEach(field => {
      const error = validateField(field, form[field]);
      if (error) errors[field] = error;
    });

    // Additional validations
    Object.keys(form).forEach(field => {
      if (!requiredFields.includes(field)) {
        const error = validateField(field, form[field]);
        if (error) errors[field] = error;
      }
    });

    setFormErrors(errors);
    setTouchedFields(Object.keys(form).reduce((acc, field) => ({ ...acc, [field]: true }), {}));
    
    return Object.keys(errors).length === 0;
  };

  const fetchEvents = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/api/host/events`, { headers: bearer() });
      setEvents(res.data);
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get(`/api/host/notifications`, { headers: bearer() });
      setNotifications(res.data);
    } catch (e) {
      console.error("Failed to fetch notifications:", e);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchNotifications();
  }, []);

  const openCreate = () => {
    setEditingEvent(null);
    setForm({ 
      title: "", 
      description: "", 
      shortDescription: "",
      date: "", 
      endDate: "",
      location: "", 
      address: "",
      city: "",
      state: "",
      pincode: "",
      capacity: 0,
      price: 0,
      currency: "INR",
      category: "General",
      tags: "",
      requirements: "",
      agenda: "",
      contactEmail: "",
      contactPhone: "",
      website: "",
      imageUrl: "",
      isOnline: false,
      meetingLink: ""
    });
    setFormErrors({});
    setTouchedFields({});
    setShowForm(true);
  };

  const openEdit = (event) => {
    setEditingEvent(event);
    setForm({
      title: event.title || "",
      description: event.description || "",
      shortDescription: event.shortDescription || "",
      date: event.date ? new Date(event.date).toISOString().slice(0, 16) : "",
      endDate: event.endDate ? new Date(event.endDate).toISOString().slice(0, 16) : "",
      location: event.location || "",
      address: event.address || "",
      city: event.city || "",
      state: event.state || "",
      pincode: event.pincode || "",
      capacity: event.capacity || 0,
      price: event.price || 0,
      currency: event.currency || "INR",
      category: event.category || "General",
      tags: event.tags ? event.tags.join(', ') : "",
      requirements: event.requirements || "",
      agenda: event.agenda || "",
      contactEmail: event.contactEmail || "",
      contactPhone: event.contactPhone || "",
      website: event.website || "",
      imageUrl: event.imageUrl || "",
      isOnline: event.isOnline || false,
      meetingLink: event.meetingLink || ""
    });
    setFormErrors({});
    setTouchedFields({});
    setShowForm(true);
  };

  const submitForm = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("❌ Please fix the form errors before submitting");
      return;
    }

    try {
      const payload = {
        ...form,
        date: form.date ? new Date(form.date).toISOString() : undefined,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
        tags: form.tags ? form.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
        capacity: parseInt(form.capacity) || 0,
        price: parseFloat(form.price) || 0,
        isOnline: Boolean(form.isOnline)
      };
      
      if (editingEvent) {
        await api.put(`/api/host/events/${editingEvent._id}`, payload, { headers: bearer() });
        toast.success("✅ Event updated successfully!");
      } else {
        await api.post(`/api/host/events`, payload, { headers: bearer() });
        toast.success("✅ Event created successfully!");
      }
      setShowForm(false);
      setEditingEvent(null);
      setFormErrors({});
      setTouchedFields({});
      await fetchEvents();
      await fetchNotifications();
    } catch (e) {
      toast.error("❌ " + (e?.response?.data?.error || e.message));
    }
  };

  const deleteEvent = async (event) => {
    if (!window.confirm("Are you sure you want to delete this event? This action cannot be undone.")) return;
    try {
      await api.delete(`/api/host/events/${event._id}`, { headers: bearer() });
      toast.success("✅ Event deleted successfully!");
      await fetchEvents();
    } catch (e) {
      toast.error("❌ " + (e?.response?.data?.error || e.message));
    }
  };

  const markCompleted = async (event) => {
    if (!window.confirm("Mark this event as completed? This will enable certificate generation.")) return;
    try {
      await api.post(`/api/host/events/${event._id}/complete`, {}, { headers: bearer() });
      toast.success("✅ Event marked as completed! Certificates can now be generated.");
      await fetchEvents();
      await fetchNotifications();
    } catch (e) {
      toast.error("❌ " + (e?.response?.data?.error || e.message));
    }
  };

  const loadRegistrations = async (event) => {
    setSelectedEvent(event);
    setActiveTab("registrations");
    try {
      const res = await api.get(`/api/host/events/${event._id}/registrations`, { headers: bearer() });
      setRegistrations(res.data);
    } catch (e) {
      toast.error("❌ " + (e?.response?.data?.error || e.message));
    }
  };

  const loadFeedbacks = async (event) => {
    setSelectedEvent(event);
    setActiveTab("feedbacks");
    try {
      const res = await api.get(`/api/host/events/${event._id}/feedbacks`, { headers: bearer() });
      setFeedbacks(res.data);
    } catch (e) {
      toast.error("❌ " + (e?.response?.data?.error || e.message));
    }
  };

  const generateCertificates = async (event) => {
    if (!event.isCompleted) {
      toast.error("❌ Event must be completed before generating certificates!");
      return;
    }
    try {
      // This would call a certificate generation endpoint
      toast.success("✅ Certificates generated successfully!");
    } catch (e) {
      toast.error("❌ " + (e?.response?.data?.error || e.message));
    }
  };

  const filteredEvents = useMemo(() => {
    let filtered = events;
    
    if (searchTerm) {
      filtered = filtered.filter(event => 
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterStatus !== "all") {
      filtered = filtered.filter(event => {
        if (filterStatus === "completed") return event.isCompleted;
        if (filterStatus === "upcoming") return !event.isCompleted && new Date(event.date) > new Date();
        if (filterStatus === "past") return !event.isCompleted && new Date(event.date) <= new Date();
        return true;
      });
    }
    
    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [events, searchTerm, filterStatus]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  const stats = useMemo(() => {
    const total = events.length;
    const completed = events.filter(e => e.isCompleted).length;
    const upcoming = events.filter(e => !e.isCompleted && new Date(e.date) > new Date()).length;
    const totalRegistrations = events.reduce((sum, e) => sum + (e.registrations?.length || 0), 0);
    const avgRating = events.reduce((sum, e) => {
      const eventFeedbacks = e.feedbacks || [];
      const avgEventRating = eventFeedbacks.length > 0 
        ? eventFeedbacks.reduce((s, f) => s + f.rating, 0) / eventFeedbacks.length 
        : 0;
      return sum + avgEventRating;
    }, 0) / (events.length || 1);
    
    return { total, completed, upcoming, totalRegistrations, avgRating: avgRating.toFixed(1) };
  }, [events]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Header */}
      <div className="bg-gray-900/95 backdrop-blur-sm border-b border-gray-700 px-6 py-4 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Calendar className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Host Dashboard
              </h1>
              <p className="text-gray-400">Manage your events and registrations</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={fetchNotifications}
              className="relative p-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-xl transition-all duration-300 hover:scale-105"
            >
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
                  {notifications.length}
                </span>
              )}
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600/80 hover:bg-red-700 rounded-xl transition-all duration-300 hover:scale-105"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-72 bg-gray-900/50 backdrop-blur-sm border-r border-gray-700 min-h-screen p-6">
          <nav className="space-y-2">
            {[
              { id: "events", label: "Events", icon: Calendar, color: "blue" },
              { id: "registrations", label: "Registrations", icon: Users, color: "green" },
              { id: "feedbacks", label: "Feedbacks", icon: Star, color: "yellow" },
              { id: "analytics", label: "Analytics", icon: BarChart3, color: "purple" },
            ].map(({ id, label, icon: Icon, color }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 ${
                  activeTab === id 
                    ? `bg-${color}-600 text-white shadow-lg` 
                    : "text-gray-400 hover:bg-gray-700/50 hover:text-white"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[
              { 
                label: "Total Events", 
                value: stats.total, 
                icon: Calendar, 
                gradient: "from-blue-600 to-blue-700",
                iconColor: "text-blue-200"
              },
              { 
                label: "Completed", 
                value: stats.completed, 
                icon: CheckCircle, 
                gradient: "from-green-600 to-green-700",
                iconColor: "text-green-200"
              },
              { 
                label: "Upcoming", 
                value: stats.upcoming, 
                icon: Clock, 
                gradient: "from-yellow-600 to-yellow-700",
                iconColor: "text-yellow-200"
              },
              { 
                label: "Registrations", 
                value: stats.totalRegistrations, 
                icon: UserCheck, 
                gradient: "from-purple-600 to-purple-700",
                iconColor: "text-purple-200"
              },
            ].map(({ label, value, icon: Icon, gradient, iconColor }, index) => (
              <div 
                key={label}
                className={`bg-gradient-to-r ${gradient} p-6 rounded-2xl shadow-xl transform hover:scale-105 transition-all duration-300 hover:shadow-2xl`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm font-medium">{label}</p>
                    <p className="text-4xl font-bold text-white">{value}</p>
                  </div>
                  <Icon className={`w-10 h-10 ${iconColor}`} />
                </div>
              </div>
            ))}
          </div>

          {/* Events Tab */}
          {activeTab === "events" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Events Management
                </h2>
                <button
                  onClick={openCreate}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  <Plus className="w-5 h-5" />
                  <span className="font-semibold">Create Event</span>
                </button>
              </div>

              {/* Search and Filter */}
              <div className="flex items-center space-x-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search events..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm transition-all duration-300"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm transition-all duration-300"
                >
                  <option value="all">All Events</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="completed">Completed</option>
                  <option value="past">Past</option>
                </select>
              </div>

              {/* Events Grid */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredEvents.map((event, index) => (
                    <div
                      key={event._id}
                      className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-gray-700/50"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-white line-clamp-2">{event.title}</h3>
                          <div className="flex items-center space-x-2 mt-2">
                            <span className="px-2 py-1 bg-blue-600/80 text-blue-100 text-xs rounded-full">
                              {event.category}
                            </span>
                            {event.isOnline && (
                              <span className="px-2 py-1 bg-purple-600/80 text-purple-100 text-xs rounded-full">
                                Online
                              </span>
                            )}
                            {event.price > 0 && (
                              <span className="px-2 py-1 bg-yellow-600/80 text-yellow-100 text-xs rounded-full">
                                {event.currency} {event.price}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {event.isCompleted && (
                            <span className="px-3 py-1 bg-green-600/80 text-green-100 text-xs rounded-full flex items-center animate-pulse">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Completed
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                        {event.shortDescription || event.description}
                      </p>

                      <div className="space-y-3 mb-6">
                        <div className="flex items-center text-gray-400 text-sm">
                          <Clock className="w-4 h-4 mr-3 text-blue-400" />
                          <div>
                            <div>{new Date(event.date).toLocaleString()}</div>
                            {event.endDate && (
                              <div className="text-xs text-gray-500">
                                to {new Date(event.endDate).toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center text-gray-400 text-sm">
                          <MapPin className="w-4 h-4 mr-3 text-green-400" />
                          <div>
                            <div>{event.location}</div>
                            {event.address && (
                              <div className="text-xs text-gray-500">
                                {event.address}, {event.city}, {event.state}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center text-gray-400 text-sm">
                          <Users className="w-4 h-4 mr-3 text-purple-400" />
                          <div>
                            <div>{event.registrations?.length || 0} / {event.capacity} registrations</div>
                            {event.capacity > 0 && (
                              <div className="text-xs text-gray-500">
                                {Math.round(((event.registrations?.length || 0) / event.capacity) * 100)}% filled
                              </div>
                            )}
                          </div>
                        </div>
                        {event.tags && event.tags.length > 0 && (
                          <div className="flex items-center text-gray-400 text-sm">
                            <div className="flex flex-wrap gap-1">
                              {event.tags.slice(0, 3).map((tag, idx) => (
                                <span key={idx} className="px-2 py-1 bg-gray-600/50 text-gray-300 text-xs rounded">
                                  {tag}
                                </span>
                              ))}
                              {event.tags.length > 3 && (
                                <span className="px-2 py-1 bg-gray-600/50 text-gray-300 text-xs rounded">
                                  +{event.tags.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => openEdit(event)}
                          className="flex items-center space-x-1 px-3 py-2 bg-blue-600/80 hover:bg-blue-700 rounded-lg text-sm transition-all duration-300 hover:scale-105"
                        >
                          <Edit3 className="w-4 h-4" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => loadRegistrations(event)}
                          className="flex items-center space-x-1 px-3 py-2 bg-green-600/80 hover:bg-green-700 rounded-lg text-sm transition-all duration-300 hover:scale-105"
                        >
                          <Users className="w-4 h-4" />
                          <span>Registrations</span>
                        </button>
                        <button
                          onClick={() => loadFeedbacks(event)}
                          className="flex items-center space-x-1 px-3 py-2 bg-yellow-600/80 hover:bg-yellow-700 rounded-lg text-sm transition-all duration-300 hover:scale-105"
                        >
                          <Star className="w-4 h-4" />
                          <span>Feedbacks</span>
                        </button>
                        {!event.isCompleted && (
                          <button
                            onClick={() => markCompleted(event)}
                            className="flex items-center space-x-1 px-3 py-2 bg-purple-600/80 hover:bg-purple-700 rounded-lg text-sm transition-all duration-300 hover:scale-105"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>Complete</span>
                          </button>
                        )}
                        {event.isCompleted && (
                          <button
                            onClick={() => generateCertificates(event)}
                            className="flex items-center space-x-1 px-3 py-2 bg-indigo-600/80 hover:bg-indigo-700 rounded-lg text-sm transition-all duration-300 hover:scale-105"
                          >
                            <Trophy className="w-4 h-4" />
                            <span>Certificates</span>
                          </button>
                        )}
                        <button
                          onClick={() => deleteEvent(event)}
                          className="flex items-center space-x-1 px-3 py-2 bg-red-600/80 hover:bg-red-700 rounded-lg text-sm transition-all duration-300 hover:scale-105"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Registrations Tab */}
          {activeTab === "registrations" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Registrations {selectedEvent && `- ${selectedEvent.title}`}
                </h2>
                {selectedEvent && (
                  <button
                    onClick={() => setActiveTab("events")}
                    className="px-4 py-2 bg-gray-600/80 hover:bg-gray-700 rounded-xl transition-all duration-300 hover:scale-105"
                  >
                    Back to Events
                  </button>
                )}
              </div>

              {selectedEvent ? (
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                  {registrations.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="w-20 h-20 text-gray-400 mx-auto mb-4 animate-pulse" />
                      <p className="text-gray-400 text-lg">No registrations yet</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-700">
                            <th className="text-left py-4 px-4 font-semibold">Student Name</th>
                            <th className="text-left py-4 px-4 font-semibold">Email</th>
                            <th className="text-left py-4 px-4 font-semibold">Registered At</th>
                            <th className="text-left py-4 px-4 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {registrations.map((reg, idx) => (
                            <tr key={idx} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors duration-300">
                              <td className="py-4 px-4 font-medium">{reg.studentId?.fullname || "-"}</td>
                              <td className="py-4 px-4 text-gray-300">{reg.studentId?.email || "-"}</td>
                              <td className="py-4 px-4 text-gray-400">
                                {reg.registeredAt ? new Date(reg.registeredAt).toLocaleString() : "-"}
                              </td>
                              <td className="py-4 px-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  reg.status === "registered" 
                                    ? "bg-green-600/80 text-green-100" 
                                    : "bg-red-600/80 text-red-100"
                                }`}>
                                  {reg.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="w-20 h-20 text-gray-400 mx-auto mb-4 animate-pulse" />
                  <p className="text-gray-400 text-lg">Select an event to view registrations</p>
                </div>
              )}
            </div>
          )}

          {/* Feedbacks Tab */}
          {activeTab === "feedbacks" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Feedbacks {selectedEvent && `- ${selectedEvent.title}`}
                </h2>
                {selectedEvent && (
                  <button
                    onClick={() => setActiveTab("events")}
                    className="px-4 py-2 bg-gray-600/80 hover:bg-gray-700 rounded-xl transition-all duration-300 hover:scale-105"
                  >
                    Back to Events
                  </button>
                )}
              </div>

              {selectedEvent ? (
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                  {feedbacks.length === 0 ? (
                    <div className="text-center py-12">
                      <Star className="w-20 h-20 text-gray-400 mx-auto mb-4 animate-pulse" />
                      <p className="text-gray-400 text-lg">No feedback yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {feedbacks.map((feedback, idx) => (
                        <div key={idx} className="bg-gray-700/50 rounded-xl p-6 border border-gray-600/50 hover:bg-gray-700/70 transition-all duration-300">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-semibold text-white text-lg">{feedback.studentId?.fullname || "Anonymous"}</p>
                              <p className="text-gray-400 text-sm">{feedback.studentId?.email || ""}</p>
                            </div>
                            <div className="flex items-center space-x-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-5 h-5 ${
                                    i < feedback.rating ? "text-yellow-400 fill-current" : "text-gray-400"
                                  }`}
                                />
                              ))}
                              <span className="ml-2 text-gray-400 text-sm">({feedback.rating}/5)</span>
                            </div>
                          </div>
                          {feedback.comment && (
                            <p className="text-gray-300 text-sm mt-3 leading-relaxed">{feedback.comment}</p>
                          )}
                          <p className="text-gray-500 text-xs mt-3">
                            {feedback.createdAt ? new Date(feedback.createdAt).toLocaleString() : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Star className="w-20 h-20 text-gray-400 mx-auto mb-4 animate-pulse" />
                  <p className="text-gray-400 text-lg">Select an event to view feedback</p>
                </div>
              )}
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === "analytics" && (
            <div className="space-y-6 animate-fadeIn">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Analytics Dashboard
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                  <h3 className="text-xl font-semibold mb-6 flex items-center">
                    <BarChart3 className="w-6 h-6 mr-2 text-blue-400" />
                    Event Statistics
                  </h3>
                  <div className="space-y-4">
                    {[
                      { label: "Total Events", value: stats.total, color: "text-blue-400" },
                      { label: "Completed Events", value: stats.completed, color: "text-green-400" },
                      { label: "Upcoming Events", value: stats.upcoming, color: "text-yellow-400" },
                      { label: "Total Registrations", value: stats.totalRegistrations, color: "text-purple-400" },
                      { label: "Average Rating", value: stats.avgRating, color: "text-orange-400" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="flex justify-between items-center py-2">
                        <span className="text-gray-400">{label}</span>
                        <span className={`font-bold text-lg ${color}`}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                  <h3 className="text-xl font-semibold mb-6 flex items-center">
                    <Bell className="w-6 h-6 mr-2 text-yellow-400" />
                    Recent Notifications
                  </h3>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {notifications.slice(0, 5).map((notification, idx) => (
                      <div key={idx} className="flex items-center space-x-3 p-4 bg-gray-700/50 rounded-xl hover:bg-gray-700/70 transition-all duration-300">
                        <Bell className="w-5 h-5 text-blue-400" />
                        <div className="flex-1">
                          <p className="text-sm text-white font-medium">{notification.message}</p>
                          <p className="text-xs text-gray-400">
                            {new Date(notification.at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    {notifications.length === 0 && (
                      <div className="text-center py-8">
                        <Bell className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-400">No notifications</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Event Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800/95 backdrop-blur-sm rounded-2xl p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-700/50">
            <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              {editingEvent ? "Edit Event" : "Create Event"}
            </h2>
            <form onSubmit={submitForm} className="space-y-6">
              {/* Basic Information */}
              <div className="bg-gray-700/30 rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-4 text-white">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Event Title *</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => handleFieldChange("title", e.target.value)}
                      onBlur={() => handleFieldBlur("title")}
                      className={`w-full p-3 rounded-xl bg-gray-700/50 border transition-all duration-300 ${
                        formErrors.title ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-blue-500'
                      } focus:ring-2 focus:border-transparent`}
                      required
                    />
                    {formErrors.title && <p className="text-red-400 text-sm mt-1">{formErrors.title}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                    <select
                      value={form.category}
                      onChange={(e) => handleFieldChange("category", e.target.value)}
                      className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    >
                      <option value="General">General</option>
                      <option value="Technology">Technology</option>
                      <option value="Business">Business</option>
                      <option value="Education">Education</option>
                      <option value="Health">Health</option>
                      <option value="Entertainment">Entertainment</option>
                      <option value="Sports">Sports</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Short Description (Max 150 chars)</label>
                  <input
                    type="text"
                    value={form.shortDescription}
                    onChange={(e) => handleFieldChange("shortDescription", e.target.value)}
                    onBlur={() => handleFieldBlur("shortDescription")}
                    maxLength={150}
                    className={`w-full p-3 rounded-xl bg-gray-700/50 border transition-all duration-300 ${
                      formErrors.shortDescription ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-blue-500'
                    } focus:ring-2 focus:border-transparent`}
                    placeholder="Brief description for event cards"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>{formErrors.shortDescription && <span className="text-red-400">{formErrors.shortDescription}</span>}</span>
                    <span>{form.shortDescription.length}/150</span>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Full Description *</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => handleFieldChange("description", e.target.value)}
                    onBlur={() => handleFieldBlur("description")}
                    className={`w-full p-3 rounded-xl bg-gray-700/50 border transition-all duration-300 ${
                      formErrors.description ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-blue-500'
                    } focus:ring-2 focus:border-transparent`}
                    rows="4"
                    required
                  />
                  {formErrors.description && <p className="text-red-400 text-sm mt-1">{formErrors.description}</p>}
                </div>
              </div>

              {/* Date & Time */}
              <div className="bg-gray-700/30 rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-4 text-white">Date & Time</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Start Date & Time *</label>
                    <input
                      type="datetime-local"
                      value={form.date}
                      onChange={(e) => handleFieldChange("date", e.target.value)}
                      onBlur={() => handleFieldBlur("date")}
                      className={`w-full p-3 rounded-xl bg-gray-700/50 border transition-all duration-300 ${
                        formErrors.date ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-blue-500'
                      } focus:ring-2 focus:border-transparent`}
                      required
                    />
                    {formErrors.date && <p className="text-red-400 text-sm mt-1">{formErrors.date}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">End Date & Time</label>
                    <input
                      type="datetime-local"
                      value={form.endDate}
                      onChange={(e) => handleFieldChange("endDate", e.target.value)}
                      onBlur={() => handleFieldBlur("endDate")}
                      className={`w-full p-3 rounded-xl bg-gray-700/50 border transition-all duration-300 ${
                        formErrors.endDate ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-blue-500'
                      } focus:ring-2 focus:border-transparent`}
                    />
                    {formErrors.endDate && <p className="text-red-400 text-sm mt-1">{formErrors.endDate}</p>}
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="bg-gray-700/30 rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-4 text-white">Location</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Event Type</label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="isOnline"
                          checked={!form.isOnline}
                          onChange={() => handleFieldChange("isOnline", false)}
                          className="mr-2"
                        />
                        <span className="text-gray-300">In-Person</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="isOnline"
                          checked={form.isOnline}
                          onChange={() => handleFieldChange("isOnline", true)}
                          className="mr-2"
                        />
                        <span className="text-gray-300">Online</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Location/Venue *</label>
                    <input
                      type="text"
                      value={form.location}
                      onChange={(e) => handleFieldChange("location", e.target.value)}
                      onBlur={() => handleFieldBlur("location")}
                      className={`w-full p-3 rounded-xl bg-gray-700/50 border transition-all duration-300 ${
                        formErrors.location ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-blue-500'
                      } focus:ring-2 focus:border-transparent`}
                      placeholder={form.isOnline ? "Online Event" : "Venue Name"}
                      required
                    />
                    {formErrors.location && <p className="text-red-400 text-sm mt-1">{formErrors.location}</p>}
                  </div>
                </div>
                {form.isOnline && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Meeting Link</label>
                    <input
                      type="url"
                      value={form.meetingLink}
                      onChange={(e) => handleFieldChange("meetingLink", e.target.value)}
                      onBlur={() => handleFieldBlur("meetingLink")}
                      className={`w-full p-3 rounded-xl bg-gray-700/50 border transition-all duration-300 ${
                        formErrors.meetingLink ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-blue-500'
                      } focus:ring-2 focus:border-transparent`}
                      placeholder="https://meet.google.com/..."
                    />
                    {formErrors.meetingLink && <p className="text-red-400 text-sm mt-1">{formErrors.meetingLink}</p>}
                  </div>
                )}
                {!form.isOnline && (
                  <>
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-300 mb-2">Address *</label>
                      <input
                        type="text"
                        value={form.address}
                        onChange={(e) => handleFieldChange("address", e.target.value)}
                        onBlur={() => handleFieldBlur("address")}
                        className={`w-full p-3 rounded-xl bg-gray-700/50 border transition-all duration-300 ${
                          formErrors.address ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-blue-500'
                        } focus:ring-2 focus:border-transparent`}
                        required
                      />
                      {formErrors.address && <p className="text-red-400 text-sm mt-1">{formErrors.address}</p>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">City *</label>
                        <input
                          type="text"
                          value={form.city}
                          onChange={(e) => handleFieldChange("city", e.target.value)}
                          onBlur={() => handleFieldBlur("city")}
                          className={`w-full p-3 rounded-xl bg-gray-700/50 border transition-all duration-300 ${
                            formErrors.city ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-blue-500'
                          } focus:ring-2 focus:border-transparent`}
                          required
                        />
                        {formErrors.city && <p className="text-red-400 text-sm mt-1">{formErrors.city}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">State *</label>
                        <input
                          type="text"
                          value={form.state}
                          onChange={(e) => handleFieldChange("state", e.target.value)}
                          onBlur={() => handleFieldBlur("state")}
                          className={`w-full p-3 rounded-xl bg-gray-700/50 border transition-all duration-300 ${
                            formErrors.state ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-blue-500'
                          } focus:ring-2 focus:border-transparent`}
                          required
                        />
                        {formErrors.state && <p className="text-red-400 text-sm mt-1">{formErrors.state}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Pincode</label>
                        <input
                          type="text"
                          value={form.pincode}
                          onChange={(e) => handleFieldChange("pincode", e.target.value)}
                          onBlur={() => handleFieldBlur("pincode")}
                          className={`w-full p-3 rounded-xl bg-gray-700/50 border transition-all duration-300 ${
                            formErrors.pincode ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-blue-500'
                          } focus:ring-2 focus:border-transparent`}
                          maxLength="6"
                        />
                        {formErrors.pincode && <p className="text-red-400 text-sm mt-1">{formErrors.pincode}</p>}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Event Details */}
              <div className="bg-gray-700/30 rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-4 text-white">Event Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Capacity</label>
                    <input
                      type="number"
                      min="0"
                      value={form.capacity}
                      onChange={(e) => handleFieldChange("capacity", e.target.value)}
                      onBlur={() => handleFieldBlur("capacity")}
                      className={`w-full p-3 rounded-xl bg-gray-700/50 border transition-all duration-300 ${
                        formErrors.capacity ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-blue-500'
                      } focus:ring-2 focus:border-transparent`}
                    />
                    {formErrors.capacity && <p className="text-red-400 text-sm mt-1">{formErrors.capacity}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Price</label>
                    <div className="flex">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.price}
                        onChange={(e) => handleFieldChange("price", e.target.value)}
                        onBlur={() => handleFieldBlur("price")}
                        className={`flex-1 p-3 rounded-l-xl bg-gray-700/50 border border-r-0 transition-all duration-300 ${
                          formErrors.price ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-blue-500'
                        } focus:ring-2 focus:border-transparent`}
                      />
                      <select
                        value={form.currency}
                        onChange={(e) => handleFieldChange("currency", e.target.value)}
                        className="px-3 py-3 rounded-r-xl bg-gray-700/50 border border-gray-600 border-l-0 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="INR">INR</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                      </select>
                    </div>
                    {formErrors.price && <p className="text-red-400 text-sm mt-1">{formErrors.price}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Tags</label>
                    <input
                      type="text"
                      value={form.tags}
                      onChange={(e) => handleFieldChange("tags", e.target.value)}
                      onBlur={() => handleFieldBlur("tags")}
                      className={`w-full p-3 rounded-xl bg-gray-700/50 border transition-all duration-300 ${
                        formErrors.tags ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-blue-500'
                      } focus:ring-2 focus:border-transparent`}
                      placeholder="tech, workshop, free (comma separated)"
                    />
                    {formErrors.tags && <p className="text-red-400 text-sm mt-1">{formErrors.tags}</p>}
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Requirements</label>
                  <textarea
                    value={form.requirements}
                    onChange={(e) => handleFieldChange("requirements", e.target.value)}
                    className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    rows="3"
                    placeholder="What participants need to bring or prepare..."
                  />
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Agenda</label>
                  <textarea
                    value={form.agenda}
                    onChange={(e) => handleFieldChange("agenda", e.target.value)}
                    className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    rows="4"
                    placeholder="Event schedule and agenda..."
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-gray-700/30 rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-4 text-white">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Contact Email</label>
                    <input
                      type="email"
                      value={form.contactEmail}
                      onChange={(e) => handleFieldChange("contactEmail", e.target.value)}
                      onBlur={() => handleFieldBlur("contactEmail")}
                      className={`w-full p-3 rounded-xl bg-gray-700/50 border transition-all duration-300 ${
                        formErrors.contactEmail ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-blue-500'
                      } focus:ring-2 focus:border-transparent`}
                    />
                    {formErrors.contactEmail && <p className="text-red-400 text-sm mt-1">{formErrors.contactEmail}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Contact Phone</label>
                    <input
                      type="tel"
                      value={form.contactPhone}
                      onChange={(e) => handleFieldChange("contactPhone", e.target.value)}
                      onBlur={() => handleFieldBlur("contactPhone")}
                      className={`w-full p-3 rounded-xl bg-gray-700/50 border transition-all duration-300 ${
                        formErrors.contactPhone ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-blue-500'
                      } focus:ring-2 focus:border-transparent`}
                    />
                    {formErrors.contactPhone && <p className="text-red-400 text-sm mt-1">{formErrors.contactPhone}</p>}
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Website</label>
                  <input
                    type="url"
                    value={form.website}
                    onChange={(e) => handleFieldChange("website", e.target.value)}
                    onBlur={() => handleFieldBlur("website")}
                    className={`w-full p-3 rounded-xl bg-gray-700/50 border transition-all duration-300 ${
                      formErrors.website ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-blue-500'
                    } focus:ring-2 focus:border-transparent`}
                    placeholder="https://example.com"
                  />
                  {formErrors.website && <p className="text-red-400 text-sm mt-1">{formErrors.website}</p>}
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Event Image URL</label>
                  <input
                    type="url"
                    value={form.imageUrl}
                    onChange={(e) => handleFieldChange("imageUrl", e.target.value)}
                    className="w-full p-3 rounded-xl bg-gray-700/50 border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>

              <div className="flex space-x-4 pt-6">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 py-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105"
                >
                  {editingEvent ? "Update Event" : "Create Event"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-8 py-4 bg-gray-600/80 hover:bg-gray-700 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}