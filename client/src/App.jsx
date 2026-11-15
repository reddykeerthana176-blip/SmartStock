import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SocketProvider } from './context/SocketContext';
import { OfflineProvider } from './context/OfflineContext';
import { DashboardLayout } from './layouts/DashboardLayout';

// Application Pages
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { InventoryPage } from './pages/InventoryPage';
import { AddProductPage } from './pages/AddProductPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { BarcodeScannerPage } from './pages/BarcodeScannerPage';
import { SalesPage } from './pages/SalesPage';
import { SalesHistoryPage } from './pages/SalesHistoryPage';
import { StockAlertsPage } from './pages/StockAlertsPage';
import { PredictiveRestockingPage } from './pages/PredictiveRestockingPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { ReportsAnalyticsPage } from './pages/ReportsAnalyticsPage';
import { StaffManagementPage } from './pages/StaffManagementPage';
import { SettingsPage } from './pages/SettingsPage';

// Protected Route Wrapper with RBAC verification
const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-darkBg-base text-xs font-semibold text-gray-500">
        Authenticating session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
};

export const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <OfflineProvider>
            <BrowserRouter>
              <Routes>
                {/* Public Auth Routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* Core Inventory SaaS Routes */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/inventory"
                  element={
                    <ProtectedRoute>
                      <InventoryPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/products/new"
                  element={
                    <ProtectedRoute requiredRole="ADMIN">
                      <AddProductPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/products/:id"
                  element={
                    <ProtectedRoute>
                      <ProductDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/scanner"
                  element={
                    <ProtectedRoute>
                      <BarcodeScannerPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/sales/new"
                  element={
                    <ProtectedRoute>
                      <SalesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/sales"
                  element={
                    <ProtectedRoute>
                      <SalesHistoryPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/alerts"
                  element={
                    <ProtectedRoute>
                      <StockAlertsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/predictions"
                  element={
                    <ProtectedRoute requiredRole="ADMIN">
                      <PredictiveRestockingPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/suppliers"
                  element={
                    <ProtectedRoute>
                      <SuppliersPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reports"
                  element={
                    <ProtectedRoute requiredRole="ADMIN">
                      <ReportsAnalyticsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/staff"
                  element={
                    <ProtectedRoute requiredRole="ADMIN">
                      <StaffManagementPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute requiredRole="ADMIN">
                      <SettingsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Fallback Catch-all Route */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </OfflineProvider>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};
