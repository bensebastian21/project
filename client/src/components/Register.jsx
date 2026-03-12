// src/components/Register.jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Tesseract from 'tesseract.js';
import { toast } from 'react-toastify';
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

const initialForm = {
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
  studentId: null,
  secondDoc: null, // bonafide letter OR fee receipt
  password: '',
  confirmPassword: '',
  country: '',
  state: '',
  district: '',
  agreeVerification: false,
  ocrRaw: '',
  ocrMismatch: false,
};

export default function Register({ onSwitchToLogin }) {
  const [formData, setFormData] = useState(initialForm);
  const [instQuery, setInstQuery] = useState('');
  const [instOpen, setInstOpen] = useState(false);
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false); // for normal signup
  const [isGoogleLoading, setIsGoogleLoading] = useState(false); // separate for Google signup

  const validate = (field, value) => {
    switch (field) {
      case 'email':
        return /\S+@\S+\.\S+/.test(value) ? '' : 'Invalid email format';
      case 'password':
        return value.length >= 6 ? '' : 'Password must be at least 6 characters';
      case 'username':
        return /^[A-Za-z0-9_]{3,}$/.test(value)
          ? ''
          : 'Username must be at least 3 characters (letters, numbers, underscore)';
      case 'fullname':
        return /^[A-Za-z\s]+$/.test(value.trim())
          ? ''
          : 'Full name should only contain letters and spaces';
      case 'confirmPassword':
        return value === formData.password ? '' : 'Passwords do not match';
      case 'institute':
        return value && value.toString().trim() ? '' : 'Institute is required';
      case 'street':
        return value && value.toString().trim() ? '' : 'Address line 1 is required';
      case 'city':
        return '';
      case 'course':
        return /^[A-Za-z\s]+$/.test(value.trim()) ? '' : 'Only letters and spaces allowed';
      case 'pincode':
        return /^[0-9]{6}$/.test(value) ? '' : 'Pincode must be 6 digits only';
      case 'country':
      case 'state':
      case 'district':
        return value && value.toString().trim() ? '' : 'Required';
      case 'age':
        return /^[0-9]+$/.test(value) && value >= 5 && value <= 40
          ? ''
          : 'Enter a valid age (5-40 years)';
      case 'phone':
        return /^(\+91[\-\s]?)?[6-9]\d{9}$/.test(value.trim())
          ? ''
          : 'Phone must start with 6, 7, 8, or 9 and be 10 digits';
      case 'studentId':
        if (!value) return 'Student ID is required';
        if (!value.type.startsWith('image/')) return 'Only image files are allowed';
        if (value.size > 2 * 1024 * 1024) return 'File size must be under 2MB';
        return '';
      default:
        return '';
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
    } catch (_) { }
  };

  const handleChange = (e) => {
    const { name, value, files, type, checked } = e.target;
    const isFile = type === 'file';
    const val = isFile ? files?.[0] : type === 'checkbox' ? !!checked : value;
    setFormData((prev) => ({ ...prev, [name]: val }));
    const errorMsg = validate(name, val);
    setErrors((prev) => ({ ...prev, [name]: errorMsg }));
    if (isFile && (name === 'studentId' || name === 'secondDoc') && val) {
      runOcr(val);
    }
  };

  const handleFocus = (e) => {
    const { name, value, files, type, checked } = e.target;
    const val = type === 'file' ? files?.[0] : type === 'checkbox' ? !!checked : value;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const errorMsg = validate(name, val);
    setErrors((prev) => ({ ...prev, [name]: errorMsg }));
  };

  const handleBlur = (e) => {
    const { name, value, files, type, checked } = e.target;
    const val = type === 'file' ? files?.[0] : type === 'checkbox' ? !!checked : value;
    const errorMsg = validate(name, val);
    setErrors((prev) => ({ ...prev, [name]: errorMsg }));
    if (!errorMsg && (name === 'username' || name === 'email' || name === 'phone')) {
      checkAvailability(name, val);
    }
  };

  // Simple OCR pipeline: extract raw text and compare against entered fullname/institute
  const runOcr = async (file) => {
    try {
      const { data } = await Tesseract.recognize(file, 'eng');
      const raw = (data?.text || '').trim();
      const txt = raw.toLowerCase();
      const nameToken =
        (formData.fullname || '').toLowerCase().split(/\s+/).filter(Boolean)[0] || '';
      const instToken =
        (formData.institute || '').toLowerCase().split(/\s+/).filter(Boolean)[0] || '';
      const nameOk = nameToken ? txt.includes(nameToken) : true;
      const instOk = instToken ? txt.includes(instToken) : true;
      const mismatch = !(nameOk && instOk);
      setFormData((prev) => ({ ...prev, ocrRaw: raw, ocrMismatch: mismatch }));
      if (mismatch) {
        toast.warn("⚠️ ID text doesn't seem to match name or institute. Admin will review.");
      } else {
        toast.success('✅ Student ID looks consistent (pre-check)');
      }
    } catch (err) {
      console.error('OCR error', err);
      toast.error('❌ Could not read the document text. You can still submit.');
      setFormData((prev) => ({ ...prev, ocrRaw: '', ocrMismatch: false }));
    }
  };

  const storeInMongoDB = async (userData) => {
    try {
      // Handle file uploads to Cloudinary
      let studentIdUrl = null;
      let secondDocUrl = null;

      if (userData.studentId && typeof userData.studentId === 'object') {
        const uploadResult = await uploadDocument(userData.studentId);
        if (uploadResult.success) {
          studentIdUrl = uploadResult.url;
        } else {
          toast.error(uploadResult.error || 'Failed to upload student ID');
          return false;
        }
      }

      if (userData.secondDoc && typeof userData.secondDoc === 'object') {
        const uploadResult = await uploadDocument(userData.secondDoc);
        if (uploadResult.success) {
          secondDocUrl = uploadResult.url;
        } else {
          toast.error(uploadResult.error || 'Failed to upload second document');
          return false;
        }
      }

      const response = await fetch(`${config.apiBaseUrl}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...userData,
          studentId: studentIdUrl,
          secondDoc: secondDocUrl,
        }),
      });

      if (!response.ok) {
        let message = 'Registration failed';
        try {
          const data = await response.json();
          if (data?.error) message = data.error;
        } catch (_) {
          // ignore parse errors
        }
        throw new Error(message);
      }
      return true;
    } catch (error) {
      console.error('MongoDB storage error:', error);
      return false;
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    // Validate all fields
    const newErrors = {};
    for (const key in formData) {
      const error = validate(key, formData[key]);
      if (error) newErrors[key] = error;
    }
    // At least one verification document required
    if (!formData.studentId && !formData.secondDoc) {
      newErrors.studentId = newErrors.studentId || 'Student ID or Bonafide/Receipt is required';
      newErrors.secondDoc = newErrors.secondDoc || 'Upload at least one document';
    }
    // Consent required
    if (!formData.agreeVerification) {
      newErrors.agreeVerification = 'You must agree to verification';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('❌ Fix form errors');
      return;
    }

    setIsLoading(true);
    toast.info('🔄 Creating your account...');

    try {
      const userData = {
        username: formData.username,
        fullname: formData.fullname,
        institute: formData.institute,
        street: formData.street,
        city: formData.city,
        pincode: formData.pincode,
        age: parseInt(formData.age),
        course: formData.course,
        email: formData.email,
        phone: formData.phone,
        countryCode: formData.countryCode,
        studentId: formData.studentId, // file object handled by storeInMongoDB
        secondDoc: formData.secondDoc, // optional second verification doc
        password: formData.password,
        role: 'student',
        country: formData.country,
        state: formData.state,
        district: formData.district,
        agreeVerification: formData.agreeVerification ? 'true' : 'false',
        ocrRaw: formData.ocrRaw,
        ocrMismatch: formData.ocrMismatch ? 'true' : 'false',
      };

      const mongoSaved = await storeInMongoDB(userData);

      if (!mongoSaved) {
        throw new Error('Failed to save to MongoDB');
      }

      toast.success('✅ Registration successful!');
      setTimeout(() => {
        // Redirect to login page where user can sign in and trigger onboarding
        window.location.href = '/login';
      }, 1500);
    } catch (err) {
      // Surface server message if present
      const msg = err?.message || 'Registration failed';
      toast.error('❌ ' + msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = () => {
    setIsGoogleLoading(true);
    window.location.href = config.oauthStartUrl;
  };

  return (
    <motion.div
      key="register-form"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.4, ease: 'backOut' }}
      className="bg-neutral-950/80 backdrop-blur-xl border-2 border-neutral-800 shadow-[8px_8px_0px_0px_rgba(255,255,255,0.1)] p-6 md:p-8 relative z-10 max-h-[80vh] overflow-y-auto no-scrollbar"
    >
      <h2 className="text-2xl font-black uppercase tracking-tighter mb-6 text-center text-white">
        Student Registration
      </h2>

      <form className="space-y-4" onSubmit={handleRegister} encType="multipart/form-data">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-1 text-neutral-400">
              Username
            </label>
            <input
              name="username"
              placeholder="USERNAME"
              className="w-full bg-neutral-900 border-2 border-neutral-800 p-3 font-bold text-white placeholder:text-neutral-600 focus:outline-none focus:border-purple-500 transition-all"
              value={formData.username}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            {errors.username && (
              <p className="text-red-500 text-xs font-bold mt-1 uppercase">{errors.username}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-1 text-neutral-400">
              Full Name
            </label>
            <input
              name="fullname"
              placeholder="FULL NAME"
              className="w-full bg-neutral-900 border-2 border-neutral-800 p-3 font-bold text-white placeholder:text-neutral-600 focus:outline-none focus:border-purple-500 transition-all"
              value={formData.fullname}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            {errors.fullname && (
              <p className="text-red-500 text-xs font-bold mt-1 uppercase">{errors.fullname}</p>
            )}
          </div>
        </div>

        <div className="relative">
          <label className="block text-xs font-bold uppercase tracking-widest mb-1 text-neutral-400">
            Institute
          </label>
          <input
            name="institute"
            placeholder="Search Institute..."
            className="w-full bg-neutral-900 border-2 border-neutral-800 p-3 font-bold text-white placeholder:text-neutral-600 focus:outline-none focus:border-purple-500 transition-all"
            value={formData.institute}
            onChange={(e) => {
              const q = e.target.value;
              setInstQuery(q);
              setFormData((prev) => ({ ...prev, institute: q }));
              setInstOpen(true);
            }}
            onFocus={() => setInstOpen(true)}
            onBlur={(e) => {
              setTimeout(() => setInstOpen(false), 120);
              handleBlur(e);
            }}
            autoComplete="off"
          />
          {instOpen && (
            <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto no-scrollbar bg-neutral-900 text-white border-2 border-neutral-800 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]">
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
                    className="w-full text-left px-3 py-2 hover:bg-neutral-800 font-bold text-sm border-b border-neutral-800 last:border-0"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, institute: i.name }));
                      setInstQuery('');
                      setInstOpen(false);
                    }}
                    title={`${i.address}${i.phone ? ` • ${i.phone}` : ''}`}
                  >
                    <div className="truncate">{i.name}</div>
                    <div className="text-xs text-neutral-400 truncate">{i.address}</div>
                  </button>
                ))}
              <div className="border-t-2 border-neutral-800 my-0"></div>
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-neutral-400 hover:bg-neutral-800 font-bold text-sm"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setInstOpen(false)}
              >
                Other (not listed) — type manually
              </button>
            </div>
          )}
          {errors.institute && (
            <p className="text-red-500 text-xs font-bold mt-1 uppercase">{errors.institute}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-widest mb-1 text-neutral-400">
            Address
          </label>
          <div className="grid grid-cols-3 gap-2">
            <input
              name="street"
              placeholder="Street"
              className="w-full bg-neutral-900 border-2 border-neutral-800 p-3 font-bold text-white placeholder:text-neutral-600 focus:outline-none focus:border-purple-500 transition-all"
              value={formData.street}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
            <input
              name="city"
              placeholder="City"
              className="w-full bg-neutral-900 border-2 border-neutral-800 p-3 font-bold text-white placeholder:text-neutral-600 focus:outline-none focus:border-purple-500 transition-all"
              value={formData.city}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
            <input
              name="pincode"
              placeholder="PIN"
              className="w-full bg-neutral-900 border-2 border-neutral-800 p-3 font-bold text-white placeholder:text-neutral-600 focus:outline-none focus:border-purple-500 transition-all"
              value={formData.pincode}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>
          {(errors.street || errors.city || errors.pincode) && (
            <p className="text-red-500 text-xs font-bold mt-1 uppercase">Address fields required</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <select
            name="country"
            className="w-full bg-neutral-900 border-2 border-neutral-800 p-3 font-bold text-white focus:outline-none transition-all"
            value={formData.country || ''}
            onChange={(e) => {
              const val = e.target.value;
              setFormData((prev) => ({ ...prev, country: val, state: '', district: '' }));
            }}
          >
            <option value="">Country</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            name="state"
            className="w-full bg-neutral-900 border-2 border-neutral-800 p-3 font-bold text-white focus:outline-none transition-all"
            value={formData.state || ''}
            onChange={(e) => {
              const val = e.target.value;
              setFormData((prev) => ({ ...prev, state: val, district: '' }));
            }}
            disabled={!formData.country}
          >
            <option value="">State</option>
            {(STATES_BY_COUNTRY[formData.country] || []).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            name="district"
            className="w-full bg-neutral-900 border-2 border-neutral-800 p-3 font-bold text-white focus:outline-none transition-all"
            value={formData.district || ''}
            onChange={handleChange}
            disabled={!formData.state}
          >
            <option value="">District</option>
            {(DISTRICTS_BY_STATE[formData.state] || []).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-1 text-neutral-400">
              Age
            </label>
            <input
              name="age"
              type="number"
              placeholder="AGE"
              className="w-full bg-neutral-900 border-2 border-neutral-800 p-3 font-bold text-white placeholder:text-neutral-600 focus:outline-none focus:border-purple-500 transition-all"
              value={formData.age}
              onChange={handleChange}
              onBlur={handleBlur}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-1 text-neutral-400">
              Course
            </label>
            <select
              name="course"
              className="w-full bg-neutral-900 border-2 border-neutral-800 p-3 font-bold text-white focus:outline-none transition-all"
              value={formData.course}
              onChange={handleChange}
            >
              <option value="">Select</option>
              <option value="BCA">BCA</option>
              <option value="MCA">MCA</option>
              <option value="B.Tech">B.Tech</option>
              <option value="MBA">MBA</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-widest mb-1 text-neutral-400">
            Contact
          </label>
          <div className="space-y-2">
            <input
              name="email"
              type="email"
              placeholder="EMAIL"
              className="w-full bg-neutral-900 border-2 border-neutral-800 p-3 font-bold text-white placeholder:text-neutral-600 focus:outline-none focus:border-purple-500 transition-all"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            <div className="flex gap-2">
              <select
                name="countryCode"
                className="bg-neutral-900 border-2 border-neutral-800 p-3 font-bold text-white focus:outline-none"
                value={formData.countryCode}
                onChange={handleChange}
              >
                <option value="+91">+91</option>
                <option value="+1">+1</option>
              </select>
              <input
                name="phone"
                type="tel"
                placeholder="PHONE"
                className="w-full bg-neutral-900 border-2 border-neutral-800 p-3 font-bold text-white placeholder:text-neutral-600 focus:outline-none focus:border-purple-500 transition-all"
                value={formData.phone}
                onChange={handleChange}
                onBlur={handleBlur}
              />
            </div>
          </div>
          {(errors.email || errors.phone) && (
            <p className="text-red-500 text-xs font-bold mt-1 uppercase">
              Valid email & phone required
            </p>
          )}
        </div>

        <div className="space-y-3 p-4 border-2 border-dashed border-neutral-800 bg-neutral-900/50">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-1 text-white">
              Student ID Card (Image)
            </label>
            <input
              name="studentId"
              type="file"
              accept="image/*"
              className="w-full text-xs font-bold"
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-1 text-white">
              Bonafide/Fee Receipt (Optional)
            </label>
            <input
              name="secondDoc"
              type="file"
              accept="image/*,.pdf"
              className="w-full text-xs font-bold"
              onChange={handleChange}
            />
          </div>
          {formData.ocrMismatch && (
            <p className="text-xs font-bold text-amber-600 mt-1">
              ⚠️ OCR Mismatch: Admin will review manually.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <input
            name="password"
            type="password"
            placeholder="PASSWORD"
            className="w-full bg-neutral-900 border-2 border-neutral-800 p-3 font-bold text-white placeholder:text-neutral-600 focus:outline-none focus:border-purple-500 transition-all"
            value={formData.password}
            onChange={handleChange}
          />
          <input
            name="confirmPassword"
            type="password"
            placeholder="CONFIRM"
            className="w-full bg-neutral-900 border-2 border-neutral-800 p-3 font-bold text-white placeholder:text-neutral-600 focus:outline-none focus:border-purple-500 transition-all"
            value={formData.confirmPassword}
            onChange={handleChange}
          />
        </div>

        <div className="flex items-start gap-3 my-2">
          <div className="flex-shrink-0 pt-1">
            <input
              id="agreeVerification"
              name="agreeVerification"
              type="checkbox"
              className="w-4 h-4 border-2 border-neutral-700 rounded-none focus:ring-0 bg-neutral-900 text-purple-500"
              checked={!!formData.agreeVerification}
              onChange={handleChange}
            />
          </div>
          <label
            htmlFor="agreeVerification"
            className="text-xs font-bold text-neutral-400 leading-tight"
          >
            I confirm that the uploaded document is mine.
          </label>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-4 bg-white text-black font-black uppercase tracking-widest border-2 border-transparent hover:bg-neutral-100 hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] transition-all disabled:opacity-50"
        >
          {isLoading ? 'creating...' : 'Register Now'}
        </button>
      </form>

      <div className="relative py-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t-2 border-neutral-800"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="px-4 bg-neutral-950 text-xs font-bold uppercase tracking-widest text-neutral-500">
            Or
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGoogleAuth}
        disabled={isGoogleLoading}
        className="w-full py-3 bg-neutral-900 text-white font-bold uppercase tracking-widest border-2 border-neutral-800 flex items-center justify-center gap-3 hover:bg-neutral-800 hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] transition-all"
      >
        {isGoogleLoading ? (
          'Processing...'
        ) : (
          <>
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#000"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
            </svg>
            Sign up with Google
          </>
        )}
      </button>

      <div className="mt-6 text-center">
        <p className="text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wide">
          Already have an account?
        </p>
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-white font-black uppercase tracking-widest border-b-2 border-white hover:bg-white hover:text-black transition-colors"
        >
          Log In Here
        </button>
      </div>
    </motion.div>
  );
}
