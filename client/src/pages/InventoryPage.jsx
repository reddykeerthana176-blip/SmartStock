import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useOffline } from '../context/OfflineContext';
import { getOfflineProducts } from '../offline/indexedDB';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ProductFormModal } from '../components/inventory/ProductFormModal';
import { StockMovementModal } from '../components/inventory/StockMovementModal';
import { CSVImportExportModal } from '../components/inventory/CSVImportExportModal';
import { formatCurrency, getStockStatus } from '../utils/formatters';
import {
  Search,
  Plus,
  FileSpreadsheet,
  Edit,
  Trash2,
  Sliders,
  Eye,
  Filter,
  ChevronLeft,
  ChevronRight,
  PackageOpen,
} from 'lucide-react';

export const InventoryPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin } = useAuth();
  const { lastStockUpdate } = useSocket();
  const { isOnline } = useOffline();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'ALL');
  const [stockStatus, setStockStatus] = useState(searchParams.get('stockStatus') || 'ALL');
  const [sortBy, setSortBy] = useState('createdAt');
  const [order, setOrder] = useState('desc');

  // Modals state
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isMovementOpen, setIsMovementOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  const fetchProducts = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      if (!isOnline) {
        // Offline resilience: load from IndexedDB
        const offlineProds = await getOfflineProducts();
        setProducts(offlineProds);
        setMeta({ page: 1, limit: offlineProds.length, total: offlineProds.length, totalPages: 1 });
        setLoading(false);
        return;
      }

      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
        sortBy,
        order,
      });

      if (search.trim()) params.append('search', search.trim());
      if (category && category !== 'ALL') params.append('category', category);
      if (stockStatus && stockStatus !== 'ALL') params.append('stockStatus', stockStatus);

      const res = await api.get(`/products?${params.toString()}`);
      if (res.data?.success) {
        setProducts(res.data.data);
        if (res.data.meta) setMeta(res.data.meta);
      }
    } catch (err) {
      console.warn('[Fetch Products Error]', err);
    } finally {
      setLoading(false);
    }
  }, [search, category, stockStatus, sortBy, order, isOnline]);

  useEffect(() => {
    fetchProducts(1);
  }, [fetchProducts, lastStockUpdate]);

  const handleDelete = async (productId, productName) => {
    if (!window.confirm(`Are you sure you want to archive '${productName}' from active inventory?`)) {
      return;
    }
    try {
      await api.delete(`/products/${productId}`);
      fetchProducts(meta.page);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete product');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Inventory Catalog
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Manage product stock, categories, barcodes, and pricing (Max 100,000 capacity)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <Button
                variant="secondary"
                size="sm"
                icon={FileSpreadsheet}
                onClick={() => setIsCsvModalOpen(true)}
              >
                CSV Import/Export
              </Button>
              <Button
                size="sm"
                icon={Plus}
                onClick={() => {
                  setEditingProduct(null);
                  setIsAddEditOpen(true);
                }}
              >
                Add Product
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product, SKU, barcode..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          </div>

          {/* Stock Status Filter */}
          <select
            value={stockStatus}
            onChange={(e) => setStockStatus(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="ALL">All Stock Statuses</option>
            <option value="LOW_STOCK">Low Stock Only</option>
            <option value="OUT_OF_STOCK">Out of Stock Only</option>
            <option value="OVERSTOCK">Overstocked Items</option>
          </select>

          {/* Category Filter */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="ALL">All Categories</option>
            <option value="Electronics">Electronics</option>
            <option value="Electronics & Audio">Electronics & Audio</option>
            <option value="Food & Pantry">Food & Pantry</option>
            <option value="Apparel & Uniforms">Apparel & Uniforms</option>
            <option value="Tools & Hardware">Tools & Hardware</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-darkBg-base border border-gray-200 dark:border-darkBg-border text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="createdAt">Sort: Date Added</option>
            <option value="stock">Sort: Stock Level</option>
            <option value="price">Sort: Selling Price</option>
            <option value="name">Sort: Product Name</option>
          </select>
        </div>
      </Card>

      {/* Products Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/75 dark:bg-darkBg-base/75 text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-200/80 dark:border-darkBg-border uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Product / SKU</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4 text-right">Cost</th>
                <th className="py-3.5 px-4 text-right">Price</th>
                <th className="py-3.5 px-4 text-center">Stock Level</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-darkBg-border">
              {products.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-gray-400">
                    <PackageOpen className="w-8 h-8 mx-auto mb-2 stroke-1" />
                    No products matched your criteria
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const status = getStockStatus(product.currentStock, product.minimumStock, product.maximumStock);
                  return (
                    <tr
                      key={product._id}
                      className="hover:bg-gray-50/70 dark:hover:bg-darkBg-hover/50 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {product.productName}
                        </div>
                        <div className="text-[11px] text-gray-500 font-mono">
                          {product.SKU} {product.barcode ? `&bull; ${product.barcode}` : ''}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-gray-600 dark:text-gray-300">
                        {product.category}
                      </td>

                      <td className="py-3.5 px-4 text-right font-medium text-gray-600 dark:text-gray-400">
                        {formatCurrency(product.purchasePrice)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold text-gray-900 dark:text-white">
                        {formatCurrency(product.sellingPrice)}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-sm text-gray-900 dark:text-white">
                          {product.currentStock}
                        </span>
                        <span className="text-[10px] text-gray-400 block">
                          Min: {product.minimumStock}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <Badge variant={status.color}>{status.label}</Badge>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setSelectedProduct(product);
                              setIsMovementOpen(true);
                            }}
                            title="Adjust Stock"
                            className="p-1.5 rounded-lg text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition"
                          >
                            <Sliders className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => navigate(`/products/${product._id}`)}
                            title="View Details"
                            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {isAdmin && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingProduct(product);
                                  setIsAddEditOpen(true);
                                }}
                                title="Edit Product"
                                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleDelete(product._id, product.productName)}
                                title="Archive Product"
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-darkBg-border text-xs text-gray-500">
          <span>
            Showing {products.length} of {meta.total} products
          </span>

          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="secondary"
              disabled={meta.page <= 1}
              onClick={() => fetchProducts(meta.page - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="px-2 font-medium">
              Page {meta.page} of {meta.totalPages || 1}
            </span>
            <Button
              size="sm"
              variant="secondary"
              disabled={meta.page >= meta.totalPages}
              onClick={() => fetchProducts(meta.page + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Feature Modals */}
      <ProductFormModal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        product={editingProduct}
        onSaved={() => fetchProducts(meta.page)}
      />

      <StockMovementModal
        isOpen={isMovementOpen}
        onClose={() => setIsMovementOpen(false)}
        product={selectedProduct}
        onUpdated={() => fetchProducts(meta.page)}
      />

      <CSVImportExportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onImportCompleted={() => fetchProducts(1)}
      />
    </div>
  );
};
