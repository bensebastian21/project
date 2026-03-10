// src/components/HostRegister.jsx
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, Building2, MapPin, Phone, Mail, Lock, FileText, ArrowLeft } from 'lucide-react';
import config from '../config';
import { uploadDocument } from '../utils/cloudinary';
import 'react-toastify/dist/ReactToastify.css';
import { INSTITUTES } from '../data/institutes';

const COUNTRIES = ['India'];
const STATES_BY_COUNTRY = {
  India: ['Kerala', 'Tamil Nadu', 'Karnataka', 'Andhra Pradesh', 'Telangana'],
};
const DISTRICTS_BY_STATE = {
  Kerala: [
    'Kottayam',
    'Ernakulam',
    'Alappuzha',
    'Idukki',
    'Pathanamthitta',
    'Kollam',
    'Thiruvananthapuram',
    'Thrissur',
    'Palakkad',
    'Malappuram',
    'Kozhikode',
    'Wayanad',
    'Kannur',
    'Kasaragod',
  ],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai'],
  Karnataka: ['Bengaluru Urban', 'Mysuru', 'Mangaluru'],
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada'],
  Telangana: ['Hyderabad', 'Warangal'],
};

import AuthBackground from './AuthBackground';

export default function HostRegister() {
  const [formData, setFormData] = useState({
    username: '',
    fullname: '',
    institute: '',
    street: '',
    city: '',
    pincode: '',
    age: '',
    course: '',
    email: '',
    phone: '',
    countryCode: '+91',
    password: '',
    confirmPassword: '',
    country: '',
    state: '',
    district: '',
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [instQuery, setInstQuery] = useState('');
  const [instOpen, setInstOpen] = useState(false);
  const navigate = useNavigate();

  const validate = (field, value) => {
    switch (field) {
      case 'email':
        return /\S+@\S+\.\S+/.test(value) ? '' : 'Invalid email format';
      case 'password':
        return value.length >= 6 ? '' : 'Password must be at least 6 characters';
      case 'confirmPassword':
        return value === formData.password ? '' : 'Passwords do not match';
      case 'age':
        return value && parseInt(value) >= 18 ? '' : 'Must be 18 or older';
      case 'phone':
        return /^\d{10}$/.test(value) ? '' : 'Phone must be 10 digits';
      case 'pincode':
        return /^\d{6}$/.test(value) ? '' : 'Pincode must be 6 digits';
      case 'country':
      case 'state':
      case 'district':
        return value && value.toString().trim() ? '' : 'Required';
      default:
        return value.trim() ? '' : 'This field is required';
    }
  };

  const checkAvailability = async (field, val) => {
    try {
      const params = new URLSearchParams({ [field]: String(val) });
      const res = await fetch(
        `${config.apiBaseUrl}/api/auth/check-availability?${params.toString()}`
      );
      if (!res.ok) return;
      const data = await res.json();
      const available = data?.available?.[field];
      if (available === false) {
        const msg =
          field === 'username'
            ? 'Username already in use'
            : field === 'email'
              ? 'Email already in use'
              : 'Phone number already in use';
        setErrors((prev) => ({ ...prev, [field]: msg }));
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
      step1Fields.forEach((field) => {
        const error = validate(field, formData[field]);
        if (error) step1Errors[field] = error;
      });

      if (Object.keys(step1Errors).length > 0) {
        setErrors(step1Errors);
        toast.error('❌ Please fix the errors before proceeding');
        return;
      }
    } else if (currentStep === 2) {
      const step2Fields = [
        'street',
        'city',
        'pincode',
        'age',
        'course',
        'phone',
        'country',
        'state',
        'district',
      ];
      const step2Errors = {};
      step2Fields.forEach((field) => {
        const error = validate(field, formData[field]);
        if (error) step2Errors[field] = error;
      });

      if (Object.keys(step2Errors).length > 0) {
        setErrors(step2Errors);
        toast.error('❌ Please fix the errors before proceeding');
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
      if (key !== 'confirmPassword' && key !== 'document') {
        const error = validate(key, formData[key]);
        if (error) newErrors[key] = error;
      }
    });

    if (!formData.document) {
      newErrors.document = 'Document upload is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('❌ Please fix form errors');
      setIsSubmitting(false);
      return;
    }

    try {
      // Upload document to Cloudinary
      const uploadResult = await uploadDocument(formData.document);
      if (!uploadResult.success) {
        toast.error(uploadResult.error || 'Failed to upload document');
        setIsSubmitting(false);
        return;
      }

      // Prepare form data without the file
      const formDataToSend = new FormData();
      Object.keys(formData).forEach((key) => {
        if (key !== 'confirmPassword' && key !== 'document') {
          formDataToSend.append(key, formData[key]);
        }
      });
      // Add the Cloudinary URL instead of the file
      formDataToSend.append('document', uploadResult.url);

      const res = await fetch(`${config.apiBaseUrl}/api/auth/register-host`, {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(formDataToSend)),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      toast.success(
        '✅ Host registration submitted successfully! Your application is pending admin approval.'
      );
      navigate('/login');
    } catch (err) {
      toast.error('❌ ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Shared input class helper ---
  const inputCls = (field) =>
    `w-full bg-neutral-50 border-2 p-3 font-bold placeholder:text-neutral-400 focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all ${
      errors[field] && touched[field] ? 'border-red-500' : 'border-black'
    }`;

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-neutral-500">
            Username *
          </label>
          <input
            name="username"
            type="text"
            placeholder="CHOOSE A USERNAME"
            className={inputCls('username')}
            value={formData.username}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          {touched.username && errors.username && (
            <p className="text-red-600 text-xs font-bold mt-1 uppercase tracking-wide">
              {errors.username}
            </p>
          )}
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-neutral-500">
            Full Name *
          </label>
          <input
            name="fullname"
            type="text"
            placeholder="YOUR FULL NAME"
            className={inputCls('fullname')}
            value={formData.fullname}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          {touched.fullname && errors.fullname && (
            <p className="text-red-600 text-xs font-bold mt-1 uppercase tracking-wide">
              {errors.fullname}
            </p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-neutral-500">
          Institute / Organization *
        </label>
        <div className="relative">
          <input
            name="institute"
            type="text"
            placeholder="SEARCH OR TYPE INSTITUTE"
            autoComplete="off"
            className={inputCls('institute')}
            value={formData.institute}
            onChange={(e) => {
              const q = e.target.value;
              setInstQuery(q);
              setFormData((prev) => ({ ...prev, institute: q }));
              setInstOpen(true);
            }}
            onFocus={(e) => {
              setInstOpen(true);
              handleFocus(e);
            }}
            onBlur={(e) => {
              setTimeout(() => setInstOpen(false), 120);
              handleBlur(e);
            }}
          />
          {instOpen && (
            <div className="absolute z-20 mt-0 w-full max-h-52 overflow-y-auto bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              {INSTITUTES.filter((i) =>
                (instQuery || formData.institute || '')
                  .toLowerCase()
                  .split(' ')
                  .every((p) => i.name.toLowerCase().includes(p))
              )
                .slice(0, 50)
                .map((i) => (
                  <button
                    type="button"
                    key={i.name}
                    className="w-full text-left px-3 py-2 hover:bg-neutral-100 border-b border-neutral-100 last:border-0"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, institute: i.name, pincode: i.pincode }));
                      setInstQuery('');
                      setInstOpen(false);
                    }}
                  >
                    <div className="font-bold text-sm truncate">{i.name}</div>
                    <div className="text-xs text-neutral-500 truncate">
                      {i.address}
                      {i.pincode ? ` • ${i.pincode}` : ''}
                    </div>
                  </button>
                ))}
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-neutral-500 text-xs font-bold uppercase hover:bg-neutral-100"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setInstOpen(false)}
              >
                Other — type manually
              </button>
            </div>
          )}
        </div>
        {touched.institute && errors.institute && (
          <p className="text-red-600 text-xs font-bold mt-1 uppercase tracking-wide">
            {errors.institute}
          </p>
        )}
        {formData.institute && (
          <p className="text-xs text-neutral-400 mt-1 font-mono">
            {formData.institute}
            {formData.pincode ? ` • PIN: ${formData.pincode}` : ''}
          </p>
        )}
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-neutral-500">
          Email Address *
        </label>
        <input
          name="email"
          type="email"
          placeholder="YOUR@EMAIL.COM"
          className={inputCls('email')}
          value={formData.email}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {touched.email && errors.email && (
          <p className="text-red-600 text-xs font-bold mt-1 uppercase tracking-wide">
            {errors.email}
          </p>
        )}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-neutral-500">
          Address Line 1 *
        </label>
        <input
          name="street"
          type="text"
          placeholder="STREET / BUILDING"
          className={inputCls('street')}
          value={formData.street}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {touched.street && errors.street && (
          <p className="text-red-600 text-xs font-bold mt-1 uppercase tracking-wide">
            {errors.street}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-neutral-500">
            City *
          </label>
          <input
            name="city"
            type="text"
            placeholder="CITY"
            className={inputCls('city')}
            value={formData.city}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          {touched.city && errors.city && (
            <p className="text-red-600 text-xs font-bold mt-1 uppercase tracking-wide">
              {errors.city}
            </p>
          )}
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-neutral-500">
            Pincode *
          </label>
          <input
            name="pincode"
            type="text"
            placeholder="123456"
            className={inputCls('pincode')}
            value={formData.pincode}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          {touched.pincode && errors.pincode && (
            <p className="text-red-600 text-xs font-bold mt-1 uppercase tracking-wide">
              {errors.pincode}
            </p>
          )}
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-neutral-500">
            Age *
          </label>
          <input
            name="age"
            type="number"
            placeholder="25"
            className={inputCls('age')}
            value={formData.age}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          {touched.age && errors.age && (
            <p className="text-red-600 text-xs font-bold mt-1 uppercase tracking-wide">
              {errors.age}
            </p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-neutral-500">
          Department / Course *
        </label>
        <input
          name="course"
          type="text"
          placeholder="YOUR DEPARTMENT OR COURSE"
          className={inputCls('course')}
          value={formData.course}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {touched.course && errors.course && (
          <p className="text-red-600 text-xs font-bold mt-1 uppercase tracking-wide">
            {errors.course}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-neutral-500">
            Country Code
          </label>
          <select
            name="countryCode"
            className="w-full bg-neutral-50 border-2 border-black p-3 font-bold focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
            value={formData.countryCode}
            onChange={handleChange}
          >
            <option value="+91">+91 (India)</option>
            <option value="+1">+1 (USA)</option>
            <option value="+44">+44 (UK)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-neutral-500">
            Phone Number *
          </label>
          <input
            name="phone"
            type="tel"
            placeholder="9876543210"
            className={inputCls('phone')}
            value={formData.phone}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          {touched.phone && errors.phone && (
            <p className="text-red-600 text-xs font-bold mt-1 uppercase tracking-wide">
              {errors.phone}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-neutral-500">
            Password *
          </label>
          <input
            name="password"
            type="password"
            placeholder="••••••••"
            className={inputCls('password')}
            value={formData.password}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          {touched.password && errors.password && (
            <p className="text-red-600 text-xs font-bold mt-1 uppercase tracking-wide">
              {errors.password}
            </p>
          )}
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-neutral-500">
            Confirm Password *
          </label>
          <input
            name="confirmPassword"
            type="password"
            placeholder="••••••••"
            className={inputCls('confirmPassword')}
            value={formData.confirmPassword}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
          {touched.confirmPassword && errors.confirmPassword && (
            <p className="text-red-600 text-xs font-bold mt-1 uppercase tracking-wide">
              {errors.confirmPassword}
            </p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-neutral-500">
          Verification Document *
        </label>
        <div
          className={`border-2 ${errors.document ? 'border-red-500' : 'border-black border-dashed'} p-6 text-center hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all`}
        >
          <FileText className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
          <p className="text-sm font-bold uppercase tracking-widest text-neutral-600 mb-1">
            Upload Verification Document
          </p>
          <p className="text-xs text-neutral-400 mb-4">
            ID Card, Certificate, or Institution Letter (.pdf, .jpg, .png, .doc)
          </p>
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
            className="inline-block px-5 py-2 bg-black text-white font-bold uppercase tracking-widest text-xs cursor-pointer hover:bg-neutral-800 transition-colors border-2 border-transparent"
          >
            Choose File
          </label>
          {formData.document && (
            <p className="text-green-600 text-xs font-bold mt-3 uppercase tracking-wide">
              ✓ {formData.document.name}
            </p>
          )}
        </div>
        {errors.document && (
          <p className="text-red-600 text-xs font-bold mt-1 uppercase tracking-wide">
            {errors.document}
          </p>
        )}
      </div>

      <div className="border-2 border-black p-4 bg-neutral-50">
        <p className="text-xs font-black uppercase tracking-widest mb-2">📋 Application Process</p>
        <ul className="text-xs text-neutral-600 font-bold space-y-1 uppercase tracking-wide">
          <li>• Your application will be reviewed by our admin team</li>
          <li>• You'll receive an email notification once approved</li>
          <li>• Only approved hosts can create and manage events</li>
          <li>• This process usually takes 1–2 business days</li>
        </ul>
      </div>
    </div>
  );

  const STEP_LABELS = ['Personal Info', 'Contact & Location', 'Security'];

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 relative overflow-hidden">
      {/* Isolated Auth Background */}
      <AuthBackground />

      <div className="relative z-10 w-full max-w-2xl">
        {/* Back button */}
        <button
          onClick={() => navigate('/login')}
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-neutral-500 hover:text-black transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Login
        </button>

        <div className="bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
          {/* Title */}
          <div className="border-b-2 border-black pb-6 mb-8">
            <h1 className="text-3xl font-black uppercase tracking-tighter text-black">
              Host Registration
            </h1>
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 mt-1">
              Join as a host & create amazing experiences
            </p>
          </div>

          {/* Step indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              {STEP_LABELS.map((label, i) => (
                <div key={label} className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 flex items-center justify-center border-2 border-black text-xs font-black transition-all ${
                      i + 1 < currentStep
                        ? 'bg-black text-white'
                        : i + 1 === currentStep
                          ? 'bg-black text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.15)]'
                          : 'bg-white text-black'
                    }`}
                  >
                    {i + 1 < currentStep ? '✓' : i + 1}
                  </div>
                  <span
                    className={`text-xs font-bold uppercase tracking-wider hidden sm:block ${i + 1 === currentStep ? 'text-black' : 'text-neutral-400'}`}
                  >
                    {label}
                  </span>
                  {i < 2 && (
                    <div
                      className={`h-0.5 w-8 sm:w-16 ${i + 1 < currentStep ? 'bg-black' : 'bg-neutral-200'}`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="w-full bg-neutral-100 h-1 border border-black/10">
              <div
                className="h-full bg-black transition-all duration-300"
                style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
              />
            </div>
          </div>

          {/* Step title */}
          <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-6">
            Step {currentStep} of 3 — {STEP_LABELS[currentStep - 1]}
          </p>

          <form onSubmit={handleSubmit}>
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}

            <div className="flex justify-between mt-8 pt-6 border-t-2 border-dashed border-neutral-200">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 1}
                className={`flex items-center gap-2 px-5 py-3 border-2 border-black font-bold uppercase tracking-widest text-sm transition-all ${
                  currentStep === 1
                    ? 'opacity-30 cursor-not-allowed bg-neutral-100'
                    : 'bg-white hover:bg-neutral-100 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                }`}
              >
                <ArrowLeft className="w-4 h-4" /> Previous
              </button>

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex items-center gap-2 px-5 py-3 bg-black text-white font-black uppercase tracking-widest text-sm border-2 border-transparent hover:bg-neutral-800 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                >
                  Next <ArrowLeft className="w-4 h-4 rotate-180" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-3 bg-black text-white font-black uppercase tracking-widest text-sm border-2 border-transparent hover:bg-neutral-800 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{' '}
                      Submitting...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" /> Submit Application
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">
            Already have an account?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-black hover:underline font-black"
            >
              Login here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
