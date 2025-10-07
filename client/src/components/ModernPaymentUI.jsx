import React, { useState, useEffect } from 'react';
import { CreditCard, Smartphone, Wallet, Shield, CheckCircle, Lock, ArrowRight } from 'lucide-react';
import { payForEvent } from "../utils/openRazorpay";

const ModernPaymentUI = ({ event, user, onSuccess, onError, onCancel }) => {
  const [selectedMethod, setSelectedMethod] = useState('card');
  const [cardData, setCardData] = useState({
    number: '',
    name: '',
    expiry: '',
    cvv: ''
  });
  const [loading, setLoading] = useState(false);
  const [flipped, setFlipped] = useState(false);

  const paymentMethods = [
    { id: 'upi', name: 'UPI', icon: Smartphone, color: 'from-purple-500 to-pink-600' },
    { id: 'card', name: 'Card', icon: CreditCard, color: 'from-blue-500 to-indigo-600' },
  ];

  const formatCardNumber = (value) => {
    return value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim().slice(0, 19);
  };

  const formatExpiry = (value) => {
    return value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').slice(0, 5);
  };

  const handleCardInput = (field, value) => {
    if (field === 'number') {
      setCardData(prev => ({ ...prev, [field]: formatCardNumber(value) }));
    } else if (field === 'expiry') {
      setCardData(prev => ({ ...prev, [field]: formatExpiry(value) }));
    } else if (field === 'cvv') {
      setCardData(prev => ({ ...prev, [field]: value.replace(/\D/g, '').slice(0, 4) }));
    } else {
      setCardData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handlePayment = async () => {
    setLoading(true);
    try {
      await payForEvent({ event, user });
      if (onSuccess) onSuccess();
    } catch (error) {
      if (onError) onError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md max-h-[85vh] overflow-y-auto">
        {/* Event Info Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
          <h2 className="text-xl font-bold text-white mb-2">{event.title}</h2>
          <div className="flex justify-between items-center">
            <span className="text-white/80">Registration Fee</span>
            <span className="text-2xl font-bold text-white">₹{event.price}</span>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-4">Payment Method</h3>
          <div className="grid grid-cols-3 gap-3 mb-6">
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              const isSelected = selectedMethod === method.id;
              return (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  className={`p-3 rounded-xl transition-all duration-200 ${
                    isSelected 
                      ? `bg-gradient-to-r ${method.color} text-white shadow-lg scale-105` 
                      : 'bg-white/20 text-white/70 hover:bg-white/30'
                  }`}
                >
                  <Icon className="w-6 h-6 mx-auto mb-1" />
                  <span className="text-xs font-medium">{method.name}</span>
                </button>
              );
            })}
          </div>

          {/* Card Form */}
          {selectedMethod === 'card' && (
            <div className="space-y-4">
              {/* Virtual Card */}
              <div className="relative">
                <div className={`transform transition-transform duration-700 ${flipped ? 'rotate-y-180' : ''}`}>
                  {/* Front of card */}
                  <div className={`${flipped ? 'hidden' : 'block'} bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white shadow-2xl`}>
                    <div className="flex justify-between items-start mb-8">
                      <div className="text-sm font-medium">DEBIT CARD</div>
                      <div className="text-xs">VISA</div>
                    </div>
                    <div className="mb-6">
                      <div className="text-lg font-mono tracking-wider">
                        {cardData.number || '•••• •••• •••• ••••'}
                      </div>
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-xs text-white/70 mb-1">CARDHOLDER NAME</div>
                        <div className="text-sm font-medium">
                          {cardData.name || 'YOUR NAME'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-white/70 mb-1">EXPIRES</div>
                        <div className="text-sm font-medium">
                          {cardData.expiry || 'MM/YY'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Back of card */}
                  <div className={`${flipped ? 'block' : 'hidden'} bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white shadow-2xl`}>
                    <div className="h-8 bg-black rounded mt-2 mb-4"></div>
                    <div className="flex justify-end">
                      <div className="bg-white text-black px-3 py-1 rounded text-sm font-mono">
                        {cardData.cvv || '•••'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Inputs */}
              <div className="space-y-4">
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">Card Number</label>
                  <input
                    type="text"
                    value={cardData.number}
                    onChange={(e) => handleCardInput('number', e.target.value)}
                    placeholder="1234 5678 9012 3456"
                    className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">Cardholder Name</label>
                  <input
                    type="text"
                    value={cardData.name}
                    onChange={(e) => handleCardInput('name', e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">Expiry Date</label>
                    <input
                      type="text"
                      value={cardData.expiry}
                      onChange={(e) => handleCardInput('expiry', e.target.value)}
                      placeholder="MM/YY"
                      className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">CVV</label>
                    <input
                      type="text"
                      value={cardData.cvv}
                      onChange={(e) => handleCardInput('cvv', e.target.value)}
                      onFocus={() => setFlipped(true)}
                      onBlur={() => setFlipped(false)}
                      placeholder="123"
                      className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* UPI info - handled by Razorpay sheet */}
          {selectedMethod === 'upi' && (
            <div className="space-y-4 text-center text-white/80">
              <Smartphone className="w-16 h-16 text-white/50 mx-auto mb-4" />
              <p>UPI will open in your UPI app (intent flow).</p>
            </div>
          )}

          {/* Wallet removed for now to keep UI minimal */}
        </div>

        {/* Security & Actions */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-center space-x-2 text-white/70 mb-6">
            <Shield className="w-4 h-4" />
            <span className="text-sm">Secured by Razorpay • 256-bit SSL</span>
          </div>

          <div className="space-y-3">
            <button
              onClick={handlePayment}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Processing Payment...</span>
                </>
              ) : (
                <>
                  <span>Pay ₹{event.price}</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            <button
              onClick={onCancel}
              className="w-full bg-white/20 text-white py-3 px-6 rounded-xl font-medium hover:bg-white/30 transition-all duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernPaymentUI;

