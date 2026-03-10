import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, CheckCircle, AlertCircle, Mail, MapPin, Phone } from 'lucide-react';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import { Link } from 'react-router-dom';
import config from '../config';
import { toast } from 'react-toastify';

const InputField = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  validationMsg,
}) => {
  const [focused, setFocused] = useState(false);

  return (
    <div className="relative mb-8 group">
      <label className="block text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2 group-focus-within:text-black dark:group-focus-within:text-white transition-colors">
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full bg-transparent border-b-2 border-neutral-200 dark:border-neutral-800 py-3 text-xl font-medium focus:outline-none focus:border-black dark:focus:border-white transition-all placeholder:text-neutral-300"
      />

      {/* On-Focus Validation Tooltip */}
      <AnimatePresence>
        {focused && (
          <motion.div
            initial={{ opacity: 0, y: 10, x: 0 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute left-0 -bottom-8 bg-black dark:bg-white text-white dark:text-black text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-sm shadow-xl z-20 flex items-center gap-2"
          >
            <AlertCircle size={12} />
            {validationMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const TextAreaField = ({ label, name, value, onChange, placeholder, validationMsg }) => {
  const [focused, setFocused] = useState(false);

  return (
    <div className="relative mb-8 group">
      <label className="block text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2 group-focus-within:text-black dark:group-focus-within:text-white transition-colors">
        {label}
      </label>
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        rows={5}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full bg-transparent border-b-2 border-neutral-200 dark:border-neutral-800 py-3 text-xl font-medium focus:outline-none focus:border-black dark:focus:border-white transition-all resize-none placeholder:text-neutral-300"
      />

      <AnimatePresence>
        {focused && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute left-0 -bottom-8 bg-black dark:bg-white text-white dark:text-black text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-sm shadow-xl z-20 flex items-center gap-2"
          >
            <AlertCircle size={12} />
            {validationMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let baseUrl = config?.apiBaseUrl || 'http://localhost:5000/api';
      if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
      if (!baseUrl.endsWith('/api')) baseUrl += '/api';

      const res = await fetch(`${baseUrl}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setSent(true);
        toast.success('Message sent successfully!');
        setForm({ name: '', email: '', message: '' });
      } else {
        toast.error('Failed to send message.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white font-sans selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
      <Navbar />

      <main className="pt-32 pb-24 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-20">
          {/* Left: Contact Info */}
          <div className="lg:col-span-5">
            <motion.h1
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="text-[10vw] lg:text-[7rem] leading-[0.85] font-bold tracking-tighter uppercase mb-12"
            >
              Get in <br className="hidden lg:block" /> Touch
            </motion.h1>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="space-y-10"
            >
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-4 flex items-center gap-2">
                  <Mail size={16} /> Email
                </h3>
                <p className="text-2xl font-medium underline underline-offset-4 decoration-neutral-300">
                  bensebastian021@gmail.com
                </p>
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-4 flex items-center gap-2">
                  <MapPin size={16} /> Location
                </h3>
                <p className="text-2xl font-medium">Campus Hub, University Ave</p>
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-4 flex items-center gap-2">
                  <Phone size={16} /> Phone
                </h3>
                <p className="text-2xl font-medium">+1 (555) 123-4567</p>
              </div>
            </motion.div>
          </div>

          {/* Right: Form */}
          <div className="lg:col-span-7 pt-12 lg:pt-32">
            <motion.form
              onSubmit={handleSubmit}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="bg-neutral-50 dark:bg-neutral-900/50 p-8 md:p-12 border border-neutral-200 dark:border-neutral-800"
            >
              {sent ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-20">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-green-500 mb-6"
                  >
                    <CheckCircle size={64} />
                  </motion.div>
                  <h3 className="text-3xl font-bold uppercase tracking-tight mb-2">Message Sent</h3>
                  <p className="text-neutral-500 text-lg">
                    Thanks for reaching out. We'll get back to you shortly.
                  </p>
                  <button
                    onClick={() => setSent(false)}
                    type="button"
                    className="mt-8 text-xs font-bold uppercase tracking-widest underline"
                  >
                    Send another
                  </button>
                </div>
              ) : (
                <>
                  <InputField
                    label="Full Name"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    validationMsg="Please include your full name"
                  />
                  <InputField
                    label="Email Address"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="john@example.com"
                    validationMsg="We'll use this to reply to you"
                  />
                  <TextAreaField
                    label="Message"
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    placeholder="Tell us about your project..."
                    validationMsg="Don't be shy, tell us everything!"
                  />

                  <button
                    disabled={loading}
                    className="w-full bg-black dark:bg-white text-white dark:text-black py-4 text-sm font-bold uppercase tracking-widest hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                  >
                    {loading ? (
                      'Sending...'
                    ) : (
                      <>
                        Send Message{' '}
                        <Send
                          size={16}
                          className="group-hover:translate-x-1 transition-transform"
                        />
                      </>
                    )}
                  </button>
                </>
              )}
            </motion.form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
