import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CameraScanner } from '../components/barcode/CameraScanner';
import { ProductFormModal } from '../components/inventory/ProductFormModal';

export const BarcodeScannerPage = () => {
  const navigate = useNavigate();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [prefilledBarcode, setPrefilledBarcode] = useState('');

  const handleProductSelected = (product) => {
    // Navigate to POS or Product detail
    navigate(`/products/${product._id}`);
  };

  const handleAddNewWithBarcode = (barcode) => {
    setPrefilledBarcode(barcode);
    setIsAddModalOpen(true);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Point-of-Action Barcode Terminal
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Instant optical scanning via device webcam or mobile camera for inventory lookups and intake
        </p>
      </div>

      <CameraScanner
        onProductSelected={handleProductSelected}
        onAddNewWithBarcode={handleAddNewWithBarcode}
      />

      <ProductFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        product={{ barcode: prefilledBarcode, currentStock: 10 }}
        onSaved={() => setIsAddModalOpen(false)}
      />
    </div>
  );
};
