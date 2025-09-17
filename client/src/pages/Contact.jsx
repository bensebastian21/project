// src/pages/Contact.jsx
import React, { useState } from "react";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", country: "", phone: "", message: "" });
  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const onSubmit = (e) => { e.preventDefault(); alert("Message sent (demo)"); };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold mb-6">Send Us a Message</h1>
        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input className="border rounded px-3 py-2" placeholder="Name" name="name" value={form.name} onChange={onChange} required />
          <input className="border rounded px-3 py-2" placeholder="Email" name="email" type="email" value={form.email} onChange={onChange} required />
          <input className="border rounded px-3 py-2" placeholder="Country" name="country" value={form.country} onChange={onChange} />
          <input className="border rounded px-3 py-2" placeholder="Telephone" name="phone" value={form.phone} onChange={onChange} />
          <textarea className="border rounded px-3 py-2 md:col-span-2" placeholder="Message" rows={5} name="message" value={form.message} onChange={onChange} required />
          <button className="bg-black text-white px-5 py-2 rounded w-max">Send Message</button>
        </form>
      </div>
    </div>
  );
}