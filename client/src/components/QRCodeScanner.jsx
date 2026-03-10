import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, ScanLine, Camera } from 'lucide-react';

const QRCodeScanner = ({ onScanSuccess, onScanFailure, onClose }) => {
  const scannerRef = useRef(null);
  const html5QrcodeScannerRef = useRef(null);

  useEffect(() => {
    // Safety timeout to ensure DOM is ready
    const timer = setTimeout(() => {
      if (!scannerRef.current) return;

      // Prevent multiple initializations
      if (html5QrcodeScannerRef.current) {
        return;
      }

      try {
        const scanner = new Html5QrcodeScanner(
          'reader',
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            showTorchButtonIfSupported: true,
            videoConstraints: {
              facingMode: 'environment',
            },
          },
          /* verbose= */ false
        );

        html5QrcodeScannerRef.current = scanner;

        scanner.render(
          (decodedText, decodedResult) => {
            if (onScanSuccess) onScanSuccess(decodedText, decodedResult);
          },
          (errorMessage) => {
            // Ignore transient scanning errors
            // if (onScanFailure) onScanFailure(errorMessage);
          }
        );
      } catch (e) {
        console.error('Scanner initialization failed', e);
        if (onScanFailure) onScanFailure(e);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (html5QrcodeScannerRef.current) {
        try {
          html5QrcodeScannerRef.current.clear().catch((err) => {
            console.warn('Failed to clear scanner', err);
          });
          html5QrcodeScannerRef.current = null;
        } catch (e) {
          console.error('Error cleaning up scanner', e);
        }
      }
    };
  }, []); // Empty dependency array for mount/unmount only

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex justify-between items-center relative overflow-hidden">
          <div className="flex items-center gap-2 relative z-10">
            <ScanLine className="w-6 h-6 text-white animate-pulse" />
            <h3 className="text-xl font-black text-white font-gamer tracking-wide">SCAN TICKET</h3>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Decorative */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 rounded-full blur-xl pointer-events-none"></div>
        </div>

        {/* Scanner Area */}
        <div className="p-6 bg-slate-100 dark:bg-slate-800 relative min-h-[400px] flex flex-col items-center justify-center">
          <div
            id="reader"
            ref={scannerRef}
            className="w-full h-full rounded-xl overflow-hidden border-2 border-slate-300 dark:border-slate-700 shadow-inner"
          ></div>

          <p className="mt-4 text-center text-sm font-bold text-slate-500 dark:text-slate-400">
            Point camera at student QR code
          </p>
        </div>
      </div>
    </div>
  );
};

export default QRCodeScanner;
