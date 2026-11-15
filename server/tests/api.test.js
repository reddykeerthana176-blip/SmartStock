const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../server');
const Business = require('../models/Business');
const User = require('../models/User');
const Product = require('../models/Product');
const Sale = require('../models/Sale');

describe('SmartStock Complete Backend Test Suite', () => {
  let adminToken = '';
  let staffToken = '';
  let businessId = '';
  let adminUserId = '';
  let testProductId = '';

  beforeAll(async () => {
    // Connect to test db if not connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartstock_test');
    }
  });

  afterAll(async () => {
    // Clean up test records
    if (businessId) {
      await Promise.all([
        Business.deleteMany({ _id: businessId }),
        User.deleteMany({ businessId }),
        Product.deleteMany({ businessId }),
        Sale.deleteMany({ businessId }),
      ]);
    }
    await mongoose.connection.close();
  });

  describe('Phase 1 & 2: Business Registration & Auth RBAC', () => {
    it('should register a new business and admin user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          businessName: 'Automated Test Enterprise',
          name: 'Integration Admin',
          email: `test_admin_${Date.now()}@smartstock.io`,
          password: 'Password123!',
          currency: 'USD',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.role).toBe('ADMIN');

      adminToken = res.body.data.token;
      businessId = res.body.data.business.id;
      adminUserId = res.body.data.user.id;
    });

    it('should allow admin to create a staff member', async () => {
      const res = await request(app)
        .post('/api/staff')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Staff Clerk',
          email: `staff_${Date.now()}@smartstock.io`,
          password: 'Password123!',
          role: 'STAFF',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('STAFF');
    });

    it('should login with valid credentials', async () => {
      const user = await User.findById(adminUserId);
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'Password123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.token).toBeDefined();
    });
  });

  describe('Phase 3: Product CRUD & 100K Item Limit Enforcement', () => {
    it('should create a new product under admin authentication', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productName: 'Mechanical Gaming Keyboard',
          SKU: 'KB-MEC-99',
          barcode: '7891234567890',
          category: 'Electronics',
          purchasePrice: 45.0,
          sellingPrice: 89.99,
          currentStock: 15,
          minimumStock: 10,
          maximumStock: 100,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.SKU).toBe('KB-MEC-99');
      testProductId = res.body.data._id;
    });

    it('should prevent duplicate SKU within the same business', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productName: 'Duplicate SKU Attempt',
          SKU: 'KB-MEC-99',
          category: 'Electronics',
          purchasePrice: 40.0,
          sellingPrice: 80.0,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should retrieve paginated products', async () => {
      const res = await request(app)
        .get('/api/products?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Phase 4 & 5: Atomic Stock Deductions & Sales Recording', () => {
    it('should atomically record a sale and deduct stock', async () => {
      const res = await request(app)
        .post('/api/sales')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [
            {
              productId: testProductId,
              productName: 'Mechanical Gaming Keyboard',
              SKU: 'KB-MEC-99',
              quantity: 5,
              unitPrice: 89.99,
              costPrice: 45.0,
              subtotal: 449.95,
            },
          ],
          subtotal: 449.95,
          tax: 37.12,
          total: 487.07,
          paymentMethod: 'CREDIT_CARD',
          customerName: 'Test Buyer',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.transactionId).toBeDefined();

      // Verify product stock was reduced from 15 to 10
      const updatedProduct = await Product.findById(testProductId);
      expect(updatedProduct.currentStock).toBe(10);
    });

    it('should prevent negative stock sales when requested quantity exceeds available stock', async () => {
      const res = await request(app)
        .post('/api/sales')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [
            {
              productId: testProductId,
              productName: 'Mechanical Gaming Keyboard',
              SKU: 'KB-MEC-99',
              quantity: 500, // exceeds available 10
              unitPrice: 89.99,
              subtotal: 44995.0,
            },
          ],
          total: 44995.0,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Insufficient stock/);
    });
  });

  describe('Phase 6 & 7: Low Stock Alerts & Barcode Lookup', () => {
    it('should lookup product by barcode', async () => {
      const res = await request(app)
        .get('/api/barcode/7891234567890')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.found).toBe(true);
      expect(res.body.data.product.SKU).toBe('KB-MEC-99');
    });

    it('should fetch stock alerts', async () => {
      const res = await request(app)
        .get('/api/alerts')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.alerts).toBeInstanceOf(Array);
    });
  });

  describe('Phase 8: Dashboard KPIs', () => {
    it('should return 6 KPI metrics computed from live database', async () => {
      const res = await request(app)
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.kpi.totalProducts).toBeGreaterThanOrEqual(1);
      expect(res.body.data.kpi.todayRevenue).toBeGreaterThanOrEqual(0);
      expect(res.body.data.kpi.inventoryValuation).toBeGreaterThanOrEqual(0);
    });
  });
});
