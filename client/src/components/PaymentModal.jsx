import React, { useEffect, useRef } from 'react';
import { payForEvent } from "../utils/openRazorpay";

// This component no longer renders any UI. When opened, it immediately
// launches Razorpay and then closes itself, forwarding success/error.
const PaymentModal = ({ 
  isOpen, 
  onClose, 
  event, 
  user, 
  onSuccess, 
  onError,
}) => {
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      hasStartedRef.current = false;
      return;
    }
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    (async () => {
      try {
        // No method passed: Razorpay will show supported options directly
        await payForEvent({ event, user });
        try { onSuccess && onSuccess(); } catch (_) {}
      } catch (err) {
        try { onError && onError(err); } catch (_) {}
      } finally {
        try { onClose && onClose(); } catch (_) {}
      }
    })();
  }, [isOpen, event, user, onSuccess, onError, onClose]);

  return null;
};

export default PaymentModal;