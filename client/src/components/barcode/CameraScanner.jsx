import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../../services/api';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { formatCurrency } from '../../utils/formatters';
import { Camera, CameraOff, Search, PlusCircle, CheckCircle2, AlertTriangle, ArrowDownLeft } from 'lucide-react';

export const CameraScanner = ({ onProductSelected, onAddNewWithBarcode }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [foundProduct, setFoundProduct] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const html5QrCodeRef = useRef(null);

  // Play subtle beep sound on detection
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch {
      // AudioContext not allowed without user interaction fallback
    }
  };

  const lookupBarcode = async (code) => {
    if (!code || !code.trim()) return;
    setLoading(true);
    setNotFound(false);
    setFoundProduct(null);

    try {
      const res = await api.get(`/barcode/${encodeURIComponent(code.trim())}`);
      if (res.data?.success && res.data.data.found) {
        setFoundProduct(res.data.data.product);
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const startScanner = async () => {
    setCameraError('');
    setIsScanning(true);

    try {
      const html5QrCode = new Html5Qrcode('barcode-reader');
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 280, height: 180 },
          aspectRatio: 1.777778,
        },
        (decodedText) => {
          playBeep();
          setScannedCode(decodedText);
          lookupBarcode(decodedText);
          stopScanner();
        },
        () => {
          // ignore scan frame errors
        }
      );
    } catch (err) {
      console.warn('[Camera Scanner Error]', err);
      setCameraError('Unable to access camera. Please allow camera permissions or enter barcode manually below.');
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Failed to stop camera scanner:', err);
      }
    }
    setIsScanning(false);
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const handleManualSearch = (e) => {
    e.preventDefault();
    if (manualCode) {
      setScannedCode(manualCode);
      lookupBarcode(manualCode);
    }
  };

  return (
    <div className="space-y-6">
      {/* Camera Viewport & Controls */}
      <Card className="overflow-hidden p-0 border border-gray-200 dark:border-darkBg-border">
        <div className="p-4 sm:p-5 flex items-center justify-between border-b border-gray-100 dark:border-darkBg-border">
          <div>
            <h3 className="font-bold text-sm text-gray-900 dark:text-white">
              Optical Barcode Scanner
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Supports EAN-13, EAN-8, UPC-A, UPC-E, and Code-128
            </p>
          </div>

          <Button
            size="sm"
            variant={isScanning ? 'danger' : 'primary'}
            icon={isScanning ? CameraOff : Camera}
            onClick={isScanning ? stopScanner : startScanner}
          >
            {isScanning ? 'Stop Camera' : 'Start Camera'}
          </Button>
        </div>

        {/* Viewfinder Area */}
        <div className="relative bg-gray-900 min-h-[260px] flex items-center justify-center">
          <div id="barcode-reader" className="w-full max-w-md mx-auto" />

          {!isScanning && (
            <div className="text-center p-6 text-gray-400 space-y-2">
              <Camera className="w-12 h-12 mx-auto stroke-1 text-gray-500" />
              <p className="text-xs">Camera is inactive. Click "Start Camera" to scan with webcam or mobile device.</p>
            </div>
          )}

          {cameraError && (
            <div className="absolute inset-4 flex items-center justify-center p-4 rounded-xl bg-red-950/80 text-red-200 text-xs text-center border border-red-800">
              <AlertTriangle className="w-4 h-4 mr-2 shrink-0" />
              <span>{cameraError}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Manual Input Fallback */}
      <Card>
        <form onSubmit={handleManualSearch} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Or enter Barcode or SKU manually (e.g. 097855173515)..."
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          </div>
          <Button type="submit" loading={loading}>
            Lookup
          </Button>
        </form>
      </Card>

      {/* Scan Results & Product Card */}
      {foundProduct && (
        <Card className="border-2 border-emerald-500/40 dark:border-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/10">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                  {foundProduct.productName}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  SKU: {foundProduct.SKU} &bull; Barcode: {foundProduct.barcode || scannedCode}
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-base font-bold text-gray-900 dark:text-white">
                {formatCurrency(foundProduct.sellingPrice)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Stock: <strong className="text-brand-600 dark:text-brand-400">{foundProduct.currentStock} units</strong>
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-200/60 dark:border-darkBg-border flex flex-wrap gap-2 justify-end">
            {onProductSelected && (
              <Button size="sm" onClick={() => onProductSelected(foundProduct)}>
                Select for Sale POS
              </Button>
            )}
          </div>
        </Card>
      )}

      {notFound && (
        <Card className="border border-amber-200 dark:border-amber-900 bg-amber-50/30 dark:bg-amber-950/10 text-center py-6">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <h4 className="font-bold text-sm text-gray-900 dark:text-white">
            No Product Found for Barcode: {scannedCode}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4">
            This barcode is not registered in your active inventory catalog.
          </p>
          {onAddNewWithBarcode && (
            <Button
              size="sm"
              icon={PlusCircle}
              onClick={() => onAddNewWithBarcode(scannedCode)}
            >
              Add New Product with this Barcode
            </Button>
          )}
        </Card>
      )}
    </div>
  );
};
