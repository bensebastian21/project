// src/components/HostRegister.jsx
import React, { useState } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { UserPlus, Building2, MapPin, Phone, Mail, Lock, FileText, ArrowLeft } from "lucide-react";
import config from "../config";
import "react-toastify/dist/ReactToastify.css";
import { INSTITUTES } from "../data/institutes";

const COUNTRIES = ["India"];
const STATES_BY_COUNTRY = { India: ["Kerala", "Tamil Nadu", "Karnataka", "Andhra Pradesh", "Telangana"] };
const DISTRICTS_BY_STATE = {
  Kerala: ["Kottayam", "Ernakulam", "Alappuzha", "Idukki", "Pathanamthitta", "Kollam", "Thiruvananthapuram", "Thrissur", "Palakkad", "Malappuram", "Kozhikode", "Wayanad", "Kannur", "Kasaragod"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai"],
  Karnataka: ["Bengaluru Urban", "Mysuru", "Mangaluru"],
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada"],
  Telangana: ["Hyderabad", "Warangal"],
};

export default function HostRegister() {
  const [formData, setFormData] = useState({
    username: "",
    fullname: "",
    institute: "",
    street: "",
    city: "",
    pincode: "",
    age: "",
    course: "",
    email: "",
    phone: "",
    countryCode: "+91",
    password: "",
    confirmPassword: "",
    country: "",
    state: "",
    district: "",
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [instQuery, setInstQuery] = useState("");
  const [instOpen, setInstOpen] = useState(false);
  const navigate = useNavigate();

  const validate = (field, value) => {
    switch (field) {
      case "email":
        return /\S+@\S+\.\S+/.test(value) ? "" : "Invalid email format";
      case "password":
        return value.length >= 6 ? "" : "Password must be at least 6 characters";
      case "confirmPassword":
        return value === formData.password ? "" : "Passwords do not match";
      case "age":
        return value && parseInt(value) >= 18 ? "" : "Must be 18 or older";
      case "phone":
        return /^\d{10}$/.test(value) ? "" : "Phone must be 10 digits";
      case "pincode":
        return /^\d{6}$/.test(value) ? "" : "Pincode must be 6 digits";
      case "country":
      case "state":
      case "district":
        return value && value.toString().trim() ? "" : "Required";
      default:
        return value.trim() ? "" : "This field is required";
    }
  };

  const checkAvailability = async (field, val) => {
    try {
      const params = new URLSearchParams({ [field]: String(val) });
      const res = await fetch(`${config.apiBaseUrl}/api/auth/check-availability?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      const available = data?.available?.[field];
      if (available === false) {
        const msg = field === 'username' ? 'Username already in use' : field === 'email' ? 'Email already in use' : 'Phone number already in use';
        setErrors(prev => ({ ...prev, [field]: msg }));
        toast.error(`❌ ${msg}`);
      }
    } catch (_) {}
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: validate(name, value) }));
  };

  const handleFocus = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    // run immediate validation to give early feedback
    setErrors((prev) => ({ ...prev, [name]: validate(name, value) }));
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const msg = validate(name, value);
    setErrors((prev) => ({ ...prev, [name]: msg }));
    if (!msg && (name === 'username' || name === 'email' || name === 'phone')) {
      checkAvailability(name, value);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({ ...prev, document: file }));
    }
  };

  const nextStep = () => {
    if (currentStep === 1) {
      const step1Fields = ['username', 'fullname', 'institute', 'email'];
      const step1Errors = {};
      step1Fields.forEach(field => {
        const error = validate(field, formData[field]);
        if (error) step1Errors[field] = error;
      });
      
      if (Object.keys(step1Errors).length > 0) {
        setErrors(step1Errors);
        toast.error("❌ Please fix the errors before proceeding");
        return;
      }
    } else if (currentStep === 2) {
      const step2Fields = ['street', 'city', 'pincode', 'age', 'course', 'phone', 'country', 'state', 'district'];
      const step2Errors = {};
      step2Fields.forEach(field => {
        const error = validate(field, formData[field]);
        if (error) step2Errors[field] = error;
      });
      
      if (Object.keys(step2Errors).length > 0) {
        setErrors(step2Errors);
        toast.error("❌ Please fix the errors before proceeding");
        return;
      }
    }
    setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validate all fields
    const newErrors = {};
    Object.keys(formData).forEach((key) => {
      if (key !== "confirmPassword" && key !== "document") {
        const error = validate(key, formData[key]);
        if (error) newErrors[key] = error;
      }
    });

    if (!formData.document) {
      newErrors.document = "Document upload is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("❌ Please fix form errors");
      setIsSubmitting(false);
      return;
    }

    try {
      const formDataToSend = new FormData();
      Object.keys(formData).forEach((key) => {
        if (key !== "confirmPassword" && key !== "document") {
          formDataToSend.append(key, formData[key]);
        }
      });
      formDataToSend.append("document", formData.document);

      const res = await fetch(`${config.apiBaseUrl}/api/auth/register-host`, {
        method: "POST",
        body: formDataToSend,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");

      toast.success("✅ Host registration submitted successfully! Your application is pending admin approval.");
      navigate("/login");
    } catch (err) {
      toast.error("❌ " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-orange-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <UserPlus className="w-8 h-8 text-orange-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Personal Information</h2>
        <p className="text-gray-400 text-sm">Tell us about yourself</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <UserPlus className="w-4 h-4 inline mr-2" />
            Username *
          </label>
          <input
            name="username"
            type="text"
            placeholder="Choose a username"
            className={`w-full p-3 rounded-lg bg-gray-800/60 border focus:ring-2 focus:ring-orange-500 transition-all ${
              errors.username ? 'border-red-500' : 'border-gray-600'
            }`}
            value={formData.username}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          {touched.username && errors.username && <p className="text-red-400 text-sm mt-1">{errors.username}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <UserPlus className="w-4 h-4 inline mr-2" />
            Full Name *
          </label>
          <input
            name="fullname"
            type="text"
            placeholder="Your full name"
            className={`w-full p-3 rounded-lg bg-gray-800/60 border focus:ring-2 focus:ring-orange-500 transition-all ${
              errors.fullname ? 'border-red-500' : 'border-gray-600'
            }`}
            value={formData.fullname}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          {touched.fullname && errors.fullname && <p className="text-red-400 text-sm mt-1">{errors.fullname}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          <Building2 className="w-4 h-4 inline mr-2" />
          Institute/Organization *
        </label>
        <div className="relative">
          <input
            name="institute"
            type="text"
            placeholder="Select institute"
            className={`w-full p-3 rounded-lg bg-gray-800/60 border focus:ring-2 focus:ring-orange-500 transition-all ${
              errors.institute ? 'border-red-500' : 'border-gray-600'
            }`}
            value={formData.institute}
            onChange={(e)=>{
              const q = e.target.value;
              setInstQuery(q);
              setFormData(prev=> ({ ...prev, institute: q }));
              setInstOpen(true);
            }}
            onFocus={(e)=>{ setInstOpen(true); handleFocus(e); }}
            onBlur={(e)=>{ setTimeout(()=> setInstOpen(false), 120); handleBlur(e); }}
            autoComplete="off"
          />
          {instOpen && (
            <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto no-scrollbar bg-white text-slate-900 border border-slate-200 rounded-lg shadow-lg">
              {INSTITUTES
                .filter(i=> (instQuery||formData.institute||"").toLowerCase().split(" ").every(p=> i.name.toLowerCase().includes(p)))
                .slice(0,50)
                .map(i=> (
                  <button
                    type="button"
                    key={i.name}
                    className="w-full text-left px-3 py-2 hover:bg-slate-100"
                    onMouseDown={(e)=> e.preventDefault()}
                    onClick={()=>{
                      setFormData(prev=> ({ ...prev, institute: i.name, pincode: i.pincode }));
                      setInstQuery("");
                      setInstOpen(false);
                    }}
                    title={`${i.address}${i.phone? ` • ${i.phone}`: ''}`}
                  >
                    <div className="font-medium truncate">{i.name}</div>
                    <div className="text-xs text-slate-600 truncate">{i.address}{i.pincode? ` • ${i.pincode}`: ''}</div>
                  </button>
                ))}
              <div className="border-t border-slate-200 my-1"></div>
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-100"
                onMouseDown={(e)=> e.preventDefault()}
                onClick={()=>{
                  // Keep current typed value; just close the list to allow manual entry
                  setInstOpen(false);
                }}
              >
                Other (not listed) — type your institute
              </button>
              {INSTITUTES.filter(i=> (instQuery||formData.institute||"").toLowerCase().split(" ").every(p=> i.name.toLowerCase().includes(p))).length===0 && (
                <div className="px-3 py-2 text-sm text-slate-600">No matches</div>
              )}
            </div>
          )}
        </div>
        {touched.institute && errors.institute && <p className="text-red-400 text-sm mt-1">{errors.institute}</p>}
        {formData.institute && (
          <p className="text-xs text-gray-400 mt-1">
            Selected: {formData.institute} {formData.pincode && `• Pincode auto-filled: ${formData.pincode}`}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          <Mail className="w-4 h-4 inline mr-2" />
          Email Address *
        </label>
        <input
          name="email"
          type="email"
          placeholder="your.email@institution.com"
          className={`w-full p-3 rounded-lg bg-gray-800/60 border focus:ring-2 focus:ring-orange-500 transition-all ${
            errors.email ? 'border-red-500' : 'border-gray-600'
          }`}
          value={formData.email}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {touched.email && errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-orange-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <MapPin className="w-8 h-8 text-orange-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Contact & Location</h2>
        <p className="text-gray-400 text-sm">Your contact details and address</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          <MapPin className="w-4 h-4 inline mr-2" />
          Address Line 1 *
        </label>
        <input
          name="street"
          type="text"
          placeholder="Address Line 1"
          className={`w-full p-3 rounded-lg bg-gray-800/60 border focus:ring-2 focus:ring-orange-500 transition-all ${
            errors.street ? 'border-red-500' : 'border-gray-600'
          }`}
          value={formData.street}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {touched.street && errors.street && <p className="text-red-400 text-sm mt-1">{errors.street}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Address Line 2 *</label>
          <input
            name="city"
            type="text"
            placeholder="Address Line 2"
            className={`w-full p-3 rounded-lg bg-gray-800/60 border focus:ring-2 focus:ring-orange-500 transition-all ${
              errors.city ? 'border-red-500' : 'border-gray-600'
            }`}
            value={formData.city}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          {touched.city && errors.city && <p className="text-red-400 text-sm mt-1">{errors.city}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Pincode *</label>
          <input
            name="pincode"
            type="text"
            placeholder="123456"
            className={`w-full p-3 rounded-lg bg-gray-800/60 border focus:ring-2 focus:ring-orange-500 transition-all ${
              errors.pincode ? 'border-red-500' : 'border-gray-600'
            }`}
            value={formData.pincode}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          {touched.pincode && errors.pincode && <p className="text-red-400 text-sm mt-1">{errors.pincode}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Age *</label>
          <input
            name="age"
            type="number"
            placeholder="25"
            className={`w-full p-3 rounded-lg bg-gray-800/60 border focus:ring-2 focus:ring-orange-500 transition-all ${
              errors.age ? 'border-red-500' : 'border-gray-600'
            }`}
            value={formData.age}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          {touched.age && errors.age && <p className="text-red-400 text-sm mt-1">{errors.age}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          <Building2 className="w-4 h-4 inline mr-2" />
          Department/Course *
        </label>
        <input
          name="course"
          type="text"
          placeholder="Your department or course"
          className={`w-full p-3 rounded-lg bg-gray-800/60 border focus:ring-2 focus:ring-orange-500 transition-all ${
            errors.course ? 'border-red-500' : 'border-gray-600'
          }`}
          value={formData.course}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {touched.course && errors.course && <p className="text-red-400 text-sm mt-1">{errors.course}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Country Code</label>
          <select
            name="countryCode"
            className="w-full p-3 rounded-lg bg-gray-800/60 border border-gray-600 focus:ring-2 focus:ring-orange-500"
            value={formData.countryCode}
            onChange={handleChange}
          >
            <option value="+91">+91 (India)</option>
            <option value="+1">+1 (USA)</option>
            <option value="+44">+44 (UK)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <Phone className="w-4 h-4 inline mr-2" />
            Phone Number *
          </label>
          <input
            name="phone"
            type="tel"
            placeholder="9876543210"
            className={`w-full p-3 rounded-lg bg-gray-800/60 border focus:ring-2 focus:ring-orange-500 transition-all ${
              errors.phone ? 'border-red-500' : 'border-gray-600'
            }`}
            value={formData.phone}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          {touched.phone && errors.phone && <p className="text-red-400 text-sm mt-1">{errors.phone}</p>}
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-orange-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-orange-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Security & Verification</h2>
        <p className="text-gray-400 text-sm">Set up your password and upload verification</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <Lock className="w-4 h-4 inline mr-2" />
            Password *
          </label>
          <input
            name="password"
            type="password"
            placeholder="Minimum 6 characters"
            className={`w-full p-3 rounded-lg bg-gray-800/60 border focus:ring-2 focus:ring-orange-500 transition-all ${
              errors.password ? 'border-red-500' : 'border-gray-600'
            }`}
            value={formData.password}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          {touched.password && errors.password && <p className="text-red-400 text-sm mt-1">{errors.password}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <Lock className="w-4 h-4 inline mr-2" />
            Confirm Password *
          </label>
          <input
            name="confirmPassword"
            type="password"
            placeholder="Repeat your password"
            className={`w-full p-3 rounded-lg bg-gray-800/60 border focus:ring-2 focus:ring-orange-500 transition-all ${
              errors.confirmPassword ? 'border-red-500' : 'border-gray-600'
            }`}
            value={formData.confirmPassword}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          {touched.confirmPassword && errors.confirmPassword && <p className="text-red-400 text-sm mt-1">{errors.confirmPassword}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          <FileText className="w-4 h-4 inline mr-2" />
          Verification Document *
        </label>
        <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-orange-500 transition-colors">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-300 mb-2">Upload your verification document</p>
          <p className="text-gray-500 text-sm mb-4">ID Card, Certificate, or Institution Letter</p>
          <input
            name="document"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            className="hidden"
            id="document-upload"
            onChange={handleFileChange}
          />
          <label
            htmlFor="document-upload"
            className="inline-block px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg cursor-pointer transition-colors"
          >
            Choose File
          </label>
          {formData.document && (
            <p className="text-green-400 text-sm mt-2">✓ {formData.document.name}</p>
          )}
        </div>
        {errors.document && <p className="text-red-400 text-sm mt-1">{errors.document}</p>}
      </div>

      <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4">
        <h4 className="text-blue-400 font-semibold mb-2">📋 Application Process</h4>
        <ul className="text-gray-300 text-sm space-y-1">
          <li>• Your application will be reviewed by our admin team</li>
          <li>• You'll receive an email notification once approved</li>
          <li>• Only approved hosts can create and manage events</li>
          <li>• This process usually takes 1-2 business days</li>
        </ul>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={() => navigate("/login")}
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </button>
          <h1 className="text-4xl font-bold text-white mb-2">Host Registration</h1>
          <p className="text-gray-400">Join as an event host and create amazing experiences</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Step {currentStep} of 3</span>
            <span className="text-sm text-gray-400">{Math.round((currentStep / 3) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 3) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50">
          <form onSubmit={handleSubmit}>
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 1}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                  currentStep === 1
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-600 hover:bg-gray-700 text-white'
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                Previous
              </button>

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 rounded-lg font-medium text-white transition-all"
                >
                  Next
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 rounded-lg font-medium text-white transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Submit Application
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-gray-400 text-sm">
            Already have an account?{" "}
            <button
              onClick={() => navigate("/login")}
              className="text-orange-400 hover:underline font-medium"
            >
              Login here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
