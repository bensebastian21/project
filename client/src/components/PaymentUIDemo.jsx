import React, { useState } from 'react';
import PaymentModal from './PaymentModal';
import PaymentForm from './PaymentForm';
import ModernPaymentUI from './ModernPaymentUI';

const PaymentUIDemo = () => {
  const [activeUI, setActiveUI] = useState('modal');
  const [isOpen, setIsOpen] = useState(false);

  const mockEvent = {
    _id: 'demo-event-123',
    title: 'Tech Conference 2024',
    price: 1500,
    currency: 'INR',
    date: new Date().toISOString(),
    location: 'Mumbai, India'
  };

  const mockUser = {
    fullname: 'John Doe',
    email: 'john@example.com',
    username: 'johndoe'
  };

  const handlePaymentSuccess = () => {
    console.log('Payment successful!');
    setIsOpen(false);
  };

  const handlePaymentError = (error) => {
    console.error('Payment error:', error);
  };

  const handlePaymentCancel = () => {
    setIsOpen(false);
  };

  const uiOptions = [
    { id: 'modal', name: 'Modal UI', description: 'Clean modal with payment methods' },
    { id: 'form', name: 'Form UI', description: 'Traditional form-based payment' },
    { id: 'modern', name: 'Modern UI', description: 'Glassmorphism with virtual card' }
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Razorpay UI Alternatives Demo
        </h1>

        {/* UI Selection */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Choose Payment UI Style</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {uiOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setActiveUI(option.id)}
                className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                  activeUI === option.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <h3 className="font-semibold text-gray-900 mb-2">{option.name}</h3>
                <p className="text-sm text-gray-600">{option.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Demo Button */}
        <div className="text-center">
          <button
            onClick={() => setIsOpen(true)}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Test Payment UI
          </button>
        </div>

        {/* UI Previews */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">UI Preview</h2>
          
          {activeUI === 'modal' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Modal UI Features:</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Clean modal overlay design</li>
                <li>• Multiple payment method selection</li>
                <li>• Step-by-step payment process</li>
                <li>• Security badges and trust indicators</li>
                <li>• Responsive design</li>
              </ul>
            </div>
          )}

          {activeUI === 'form' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Form UI Features:</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Traditional form-based input</li>
                <li>• Real-time input validation</li>
                <li>• Card number formatting</li>
                <li>• Input field icons and styling</li>
                <li>• Form validation with error messages</li>
              </ul>
            </div>
          )}

          {activeUI === 'modern' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Modern UI Features:</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Glassmorphism design with backdrop blur</li>
                <li>• Virtual credit card with flip animation</li>
                <li>• Gradient backgrounds and modern styling</li>
                <li>• Payment method selection with visual feedback</li>
                <li>• Premium, modern aesthetic</li>
              </ul>
            </div>
          )}
        </div>

        {/* Render Selected UI */}
        {activeUI === 'modal' && (
          <PaymentModal
            isOpen={isOpen}
            onClose={handlePaymentCancel}
            event={mockEvent}
            user={mockUser}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
            onCancel={handlePaymentCancel}
          />
        )}

        {activeUI === 'form' && isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-auto">
              <div className="p-4 border-b">
                <button
                  onClick={handlePaymentCancel}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <PaymentForm
                event={mockEvent}
                user={mockUser}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
              />
            </div>
          </div>
        )}

        {activeUI === 'modern' && (
          <ModernPaymentUI
            event={mockEvent}
            user={mockUser}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
            onCancel={handlePaymentCancel}
          />
        )}
      </div>
    </div>
  );
};

export default PaymentUIDemo;
