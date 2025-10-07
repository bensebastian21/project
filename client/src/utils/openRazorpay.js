// utils/openRazorpay.js
import api from "../utils/api";
import config from "../config";

function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = resolve;
    s.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(s);
  });
}

export async function payForEvent({ event, user, method }) {
  if (!event) throw new Error("Missing event");
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Please login to pay");

  await loadRazorpayScript();

  // Create order (amount in paise)
  const amountPaise = Math.round((event.price || 0) * 100);
  const shortId = String(event._id || "").slice(-8);
  const shortTs = Date.now().toString().slice(-8);
  const receipt = `r_${shortId}_${shortTs}`;

  const { data: cfg } = await api.get(`/api/host/payments/config`);
  const { data: order } = await api.post(
    `/api/host/payments/create-order`,
    { amount: amountPaise, currency: event.currency || "INR", receipt },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  // Optional: limit checkout to a specific method while keeping Razorpay's native UI
  const normalizedMethod = (method || "").toLowerCase();
  const methodOptions =
    normalizedMethod && ["upi", "card", "netbanking", "wallet"].includes(normalizedMethod)
      ? {
          upi: normalizedMethod === "upi",
          card: normalizedMethod === "card",
          netbanking: normalizedMethod === "netbanking",
          wallet: normalizedMethod === "wallet",
          emi: false,
          paylater: false,
        }
      : null;

  const secureLogoUrl = window.location.origin.startsWith("https://")
    ? `${window.location.origin}/logo192.png`
    : `${window.location.origin.replace(/^http:/, "https:")}/logo192.png`;

  return new Promise((resolve, reject) => {
    const options = {
      key: cfg.keyId,
      amount: order.amount,
      currency: order.currency,
      name: `Student Events • ${event.title}`,
      description: "Complete your registration",
      image: secureLogoUrl,
      order_id: order.id,
      prefill: {
        name: user?.fullname || user?.username || "Student",
        email: user?.email || "",
        contact: user?.phone || "",
      },
      readonly: {
        email: !!user?.email,
        contact: !!user?.phone,
        name: !!(user?.fullname || user?.username),
      },
      notes: {
        eventId: String(event._id || ""),
        eventTitle: event.title || "",
        userEmail: user?.email || "",
      },
      remember_customer: true,
      retry: { enabled: true, max_count: 1 },
      ...(methodOptions ? { method: methodOptions } : {}),
      upi: { flow: "intent" },
      // Razorpay brand-aligned theme (sky/blue)
      theme: { color: "#0284c7" },
      handler: async function (response) {
        try {
          await api.post(`/api/host/payments/verify`, response, { headers: { Authorization: `Bearer ${token}` } });
          await api.post(`/api/host/public/events/${event._id}/register`, {}, { headers: { Authorization: `Bearer ${token}` } });
          resolve(response);
        } catch (e) {
          reject(e);
        }
      },
      modal: {
        confirm_close: true,
        ondismiss: function () {
          reject(new Error("Payment cancelled"));
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  });
}
