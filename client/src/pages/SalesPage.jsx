import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useOffline } from '../context/OfflineContext';
import { getOfflineProducts } from '../offline/indexedDB';
import { POSCart } from '../components/sales/POSCart';
import { ReceiptModal } from '../components/sales/ReceiptModal';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../utils/formatters';
import { Search, ShoppingBag, Plus, Sparkles } from 'lucide-react';

export const SalesPage = () => {
  const { isOnline } = useOffline();
  const [products, setProducts] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [completedSale, setCompletedSale] = useState(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      if (!isOnline) {
        const offlineProds = await getOfflineProducts();
        setProducts(offlineProds);
        setLoading(false);
        return;
      }

      const res = await api.get('/products?limit=100');
      if (res.data?.success) {
        setProducts(res.data.data);
      }
    } catch {
      // offline fallback
      const offlineProds = await getOfflineProducts();
      setProducts(offlineProds);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, [isOnline]);

  const addToCart = (product) => {
    if (product.currentStock <= 0) {
      alert(`'${product.productName}' is currently out of stock.`);
      return;
    }

    setCartItems((prev) => {
      const existing = prev.find((item) => item._id === product._id);
      if (existing) {
        if (existing.quantity >= product.currentStock) {
          alert(`Cannot add more. Only ${product.currentStock} units available.`);
          return prev;
        }
        return prev.map((item) =>
          item._id === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1, unitPrice: product.sellingPrice }];
    });
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const prod = products.find((p) => p._id === productId);
    if (prod && newQuantity > prod.currentStock) {
      alert(`Only ${prod.currentStock} units available in stock.`);
      return;
    }

    setCartItems((prev) =>
      prev.map((item) =>
        item._id === productId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const removeFromCart = (productId) => {
    setCartItems((prev) => prev.filter((item) => item._id !== productId));
  };

  const handleSaleCompleted = (saleData) => {
    setCompletedSale(saleData);
    setIsReceiptOpen(true);
    // Refresh product stock
    fetchCatalog();
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.productName.toLowerCase().includes(search.toLowerCase()) ||
      p.SKU.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode && p.barcode.includes(search));
    const matchesCategory = category === 'ALL' || p.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Point of Sale Terminal
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Fast product lookup, quantity deductions, and offline transaction processing
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Product Selection Grid */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          <Card className="p-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Scan or search products by name, SKU, or barcode..."
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              </div>

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-xs text-gray-900 dark:text-white"
              >
                <option value="ALL">All Categories</option>
                <option value="Electronics">Electronics</option>
                <option value="Electronics & Audio">Electronics & Audio</option>
                <option value="Food & Pantry">Food & Pantry</option>
                <option value="Apparel & Uniforms">Apparel & Uniforms</option>
                <option value="Tools & Hardware">Tools & Hardware</option>
              </select>
            </div>
          </Card>

          {/* Product Items Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[640px] overflow-y-auto pr-1">
            {filteredProducts.map((p) => {
              const isOutOfStock = p.currentStock <= 0;
              return (
                <div
                  key={p._id}
                  onClick={() => !isOutOfStock && addToCart(p)}
                  className={`p-3 rounded-2xl border transition-all text-left flex flex-col justify-between select-none ${
                    isOutOfStock
                      ? 'bg-gray-100/60 dark:bg-gray-900/60 border-gray-200 dark:border-gray-800 opacity-60 cursor-not-allowed'
                      : 'bg-white dark:bg-darkBg-card border-gray-200/80 dark:border-darkBg-border hover:border-brand-500 dark:hover:border-brand-500 hover:shadow-md cursor-pointer'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider truncate">
                        {p.category}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isOutOfStock
                            ? 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400'
                            : p.currentStock <= p.minimumStock
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                        }`}
                      >
                        {p.currentStock} left
                      </span>
                    </div>

                    <h4 className="font-semibold text-xs text-gray-900 dark:text-white line-clamp-2 mb-1">
                      {p.productName}
                    </h4>
                    <p className="text-[10px] font-mono text-gray-400 truncate">
                      SKU: {p.SKU}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <span className="font-bold text-xs text-gray-900 dark:text-white">
                      {formatCurrency(p.sellingPrice)}
                    </span>
                    <button
                      type="button"
                      disabled={isOutOfStock}
                      className="p-1 rounded-lg bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 hover:bg-brand-600 hover:text-white transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: POS Order Cart */}
        <div className="lg:col-span-5 xl:col-span-4 sticky top-20">
          <POSCart
            items={cartItems}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={removeFromCart}
            onClearCart={() => setCartItems([])}
            onSaleCompleted={handleSaleCompleted}
          />
        </div>
      </div>

      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        sale={completedSale}
      />
    </div>
  );
};
