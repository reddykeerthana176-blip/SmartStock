
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config/env');

const Business = require('../models/Business');
const User = require('../models/User');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Supplier = require('../models/Supplier');
const Sale = require('../models/Sale');
const InventoryMovement = require('../models/InventoryMovement');
const StockAlert = require('../models/StockAlert');
const RestockRecommendation = require('../models/RestockRecommendation');

const {
  calculateProductPrediction,
} = require('../services/predictionEngine');

const {
  checkAndGenerateAlerts,
} = require('../services/alertEngine');

const seedDatabase = async () => {
  try {
    console.log('[Seeder] Connecting to MongoDB...');

    await mongoose.connect(config.mongoUri);

    console.log('[Seeder] Connected successfully.');

    const demoAdminEmail =
      'smartstock-demo-admin@smartstock.io';

    const demoStaffEmail =
      'smartstock-demo-staff@smartstock.io';

    // Find only the dedicated demo business.
    let business = await Business.findOne({
      email: 'demo@smartstock.io',
    });

    // Check whether demo emails are already used elsewhere.
    const existingAdmin = await User.findOne({
      email: demoAdminEmail,
    });

    const existingStaff = await User.findOne({
      email: demoStaffEmail,
    });

    for (const user of [existingAdmin, existingStaff]) {
      if (
        user &&
        (!business ||
          String(user.businessId) !== String(business._id))
      ) {
        throw new Error(
          `Demo email ${user.email} belongs to another business. No data was changed.`
        );
      }
    }

    // Clean only the dedicated demo business.
    if (business) {
      console.log(
        '[Seeder] Cleaning existing demo business:',
        business._id
      );

      await Promise.all([
        Product.deleteMany({
          businessId: business._id,
        }),
        Sale.deleteMany({
          businessId: business._id,
        }),
        InventoryMovement.deleteMany({
          businessId: business._id,
        }),
        StockAlert.deleteMany({
          businessId: business._id,
        }),
        RestockRecommendation.deleteMany({
          businessId: business._id,
        }),
        Supplier.deleteMany({
          businessId: business._id,
        }),
        Category.deleteMany({
          businessId: business._id,
        }),
        User.deleteMany({
          businessId: business._id,
        }),
        Business.deleteOne({
          _id: business._id,
        }),
      ]);
    }

    // Create demo business.
    business = await Business.create({
      name: 'Apex Retail & Supplies Ltd.',
      email: 'demo@smartstock.io',
      phone: '+1 (555) 019-2834',

      address: {
        street: '450 Innovation Parkway',
        city: 'Austin',
        state: 'TX',
        postalCode: '78701',
        country: 'USA',
      },

      currency: 'USD',
      taxRate: 8.25,
      maxProducts: 100000,

      settings: {
        defaultLowStockThreshold: 12,
        defaultLeadTimeDays: 5,
        defaultSafetyStockDays: 7,
      },
    });

    console.log(
      '[Seeder] Created Business:',
      business.name
    );

    // Create demo admin and staff.
    const salt = await bcrypt.genSalt(10);

    const passwordHash = await bcrypt.hash(
      'Password123!',
      salt
    );

    const adminUser = await User.create({
      businessId: business._id,
      name: 'Eleanor Vance (Admin)',
      email: demoAdminEmail,
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
    });

    const staffUser = await User.create({
      businessId: business._id,
      name: 'Marcus Brody (Staff)',
      email: demoStaffEmail,
      passwordHash,
      role: 'STAFF',
      status: 'ACTIVE',
    });

    console.log('[Seeder] Demo users created.');

    // Create categories.
    await Category.create([
      {
        businessId: business._id,
        name: 'Electronics & Audio',
        color: '#3B82F6',
      },
      {
        businessId: business._id,
        name: 'Food & Pantry',
        color: '#10B981',
      },
      {
        businessId: business._id,
        name: 'Apparel & Uniforms',
        color: '#F59E0B',
      },
      {
        businessId: business._id,
        name: 'Tools & Hardware',
        color: '#8B5CF6',
      },
    ]);

    // Create suppliers.
    const suppliers = await Supplier.create([
      {
        businessId: business._id,
        name: 'Nexus Electronics Global',
        contactPerson: 'David Chen',
        email: 'supply@nexuselec.com',
        phone: '+1 (555) 432-8765',
        leadTimeDays: 5,
      },
      {
        businessId: business._id,
        name: 'Harvest Organic Foods Co.',
        contactPerson: 'Sarah Jenkins',
        email: 'orders@harvestorganic.com',
        phone: '+1 (555) 876-2341',
        leadTimeDays: 3,
      },
      {
        businessId: business._id,
        name: 'Vanguard Industrial Supply',
        contactPerson: 'Michael Thorne',
        email: 'sales@vanguardtools.com',
        phone: '+1 (555) 321-9876',
        leadTimeDays: 7,
      },
    ]);

    // Product seed data.
    const rawProducts = [
      {
        productName: 'Logitech MX Master 3S Wireless Mouse',
        SKU: 'ELEC-MOU-001',
        barcode: '097855173515',
        category: 'Electronics & Audio',
        description: 'Quiet clicks ergonomic performance wireless mouse',
        purchasePrice: 65,
        sellingPrice: 99.99,
        currentStock: 4,
        minimumStock: 15,
        maximumStock: 100,
        supplierId: suppliers[0]._id,
        location: 'Aisle 1, Shelf A',
      },
      {
        productName: 'Sony WH-1000XM5 Noise Canceling Headphones',
        SKU: 'ELEC-AUD-002',
        barcode: '027242923485',
        category: 'Electronics & Audio',
        description: 'Industry leading wireless noise canceling headphones',
        purchasePrice: 240,
        sellingPrice: 398,
        currentStock: 0,
        minimumStock: 10,
        maximumStock: 50,
        supplierId: suppliers[0]._id,
        location: 'Aisle 1, Shelf B',
      },
      {
        productName: 'Anker USB-C Fast Charger 65W GaN',
        SKU: 'ELEC-CHG-003',
        barcode: '194644023912',
        category: 'Electronics & Audio',
        description: 'Compact 3-port fast wall charger',
        purchasePrice: 22.5,
        sellingPrice: 49.99,
        currentStock: 42,
        minimumStock: 15,
        maximumStock: 150,
        supplierId: suppliers[0]._id,
        location: 'Aisle 1, Shelf C',
      },
      {
        productName: 'Dell UltraSharp 27 inch 4K Monitor',
        SKU: 'ELEC-MON-004',
        barcode: '884116391487',
        category: 'Electronics & Audio',
        description: '4K USB-C Hub Monitor',
        purchasePrice: 380,
        sellingPrice: 599,
        currentStock: 8,
        minimumStock: 10,
        maximumStock: 30,
        supplierId: suppliers[0]._id,
        location: 'Aisle 1, Shelf D',
      },
      {
        productName: 'Organic Jasmine Brown Rice 5kg',
        SKU: 'FOOD-RIC-001',
        barcode: '012345678905',
        category: 'Food & Pantry',
        description: 'Whole grain brown rice',
        purchasePrice: 6.2,
        sellingPrice: 12.99,
        currentStock: 9,
        minimumStock: 25,
        maximumStock: 200,
        supplierId: suppliers[1]._id,
        location: 'Aisle 3, Shelf A',
      },
      {
        productName: 'Cold Pressed Extra Virgin Olive Oil 1L',
        SKU: 'FOOD-OIL-002',
        barcode: '023456789012',
        category: 'Food & Pantry',
        description: 'Mediterranean olive oil',
        purchasePrice: 11,
        sellingPrice: 21.5,
        currentStock: 65,
        minimumStock: 20,
        maximumStock: 180,
        supplierId: suppliers[1]._id,
        location: 'Aisle 3, Shelf B',
      },
      {
        productName: 'Fair Trade Dark Roast Coffee Beans 1kg',
        SKU: 'FOOD-COF-003',
        barcode: '034567890123',
        category: 'Food & Pantry',
        description: 'Arabica dark roast coffee beans',
        purchasePrice: 13.5,
        sellingPrice: 26.99,
        currentStock: 28,
        minimumStock: 15,
        maximumStock: 100,
        supplierId: suppliers[1]._id,
        location: 'Aisle 3, Shelf C',
      },
      {
        productName: 'Raw Wildflower Blossom Honey 500g',
        SKU: 'FOOD-HON-004',
        barcode: '045678901234',
        category: 'Food & Pantry',
        description: 'Pure wildflower honey',
        purchasePrice: 5.8,
        sellingPrice: 11.99,
        currentStock: 3,
        minimumStock: 12,
        maximumStock: 80,
        supplierId: suppliers[1]._id,
        location: 'Aisle 3, Shelf D',
      },
      {
        productName: 'Heavy-Duty Workman Canvas Jacket',
        SKU: 'APP-JKT-001',
        barcode: '056789012345',
        category: 'Apparel & Uniforms',
        description: 'Water-resistant utility work jacket',
        purchasePrice: 42,
        sellingPrice: 89,
        currentStock: 14,
        minimumStock: 10,
        maximumStock: 60,
        supplierId: suppliers[2]._id,
        location: 'Aisle 4, Rack 1',
      },
      {
        productName: 'Reinforced Steel Toe Safety Boots',
        SKU: 'APP-BOT-002',
        barcode: '067890123456',
        category: 'Apparel & Uniforms',
        description: 'Slip-resistant protective footwear',
        purchasePrice: 58,
        sellingPrice: 115,
        currentStock: 19,
        minimumStock: 8,
        maximumStock: 50,
        supplierId: suppliers[2]._id,
        location: 'Aisle 4, Rack 2',
      },
      {
        productName: 'DeWalt 20V MAX Cordless Drill Driver Kit',
        SKU: 'TOOL-DRL-001',
        barcode: '885911478234',
        category: 'Tools & Hardware',
        description: 'Cordless drill driver kit',
        purchasePrice: 95,
        sellingPrice: 169,
        currentStock: 6,
        minimumStock: 12,
        maximumStock: 45,
        supplierId: suppliers[2]._id,
        location: 'Aisle 2, Bin 4',
      },
      {
        productName: 'Milwaukee 25ft Magnetic Tape Measure',
        SKU: 'TOOL-TAP-002',
        barcode: '045242508129',
        category: 'Tools & Hardware',
        description: 'Magnetic tape measure',
        purchasePrice: 12,
        sellingPrice: 24.97,
        currentStock: 52,
        minimumStock: 15,
        maximumStock: 120,
        supplierId: suppliers[2]._id,
        location: 'Aisle 2, Bin 1',
      },
    ];

    // Create products and inventory movements.
    const createdProducts = [];

    for (const prodData of rawProducts) {
      const product = await Product.create({
        ...prodData,
        businessId: business._id,
      });

      await InventoryMovement.create({
        businessId: business._id,
        productId: product._id,
        type: 'STOCK_IN',
        quantity: product.currentStock,
        previousStock: 0,
        newStock: product.currentStock,
        referenceType: 'INITIAL',
        reason: 'Initial system seed stock setup',
        performedBy: adminUser._id,
      });

      await checkAndGenerateAlerts(
        product,
        business._id
      );

      createdProducts.push(product);
    }

    console.log(
      `[Seeder] Created ${createdProducts.length} products.`
    );

    // Generate 60 days of sample sales.
    console.log('[Seeder] Generating historical sales...');

    const salesRecords = [];
    const now = new Date();

    for (let dayOffset = 59; dayOffset >= 0; dayOffset--) {
      const saleDate = new Date(now);

      saleDate.setDate(
        saleDate.getDate() - dayOffset
      );

      const dailyTxCount =
        3 + Math.floor(Math.random() * 6);

      for (let tx = 0; tx < dailyTxCount; tx++) {
        const itemsCount =
          1 + Math.floor(Math.random() * 3);

        const selectedProducts = [...createdProducts]
          .sort(() => 0.5 - Math.random())
          .slice(0, itemsCount);

        const items = selectedProducts.map((product) => {
          const quantity =
            1 + Math.floor(Math.random() * 3);

          return {
            productId: product._id,
            productName: product.productName,
            SKU: product.SKU,
            barcode: product.barcode,
            quantity,
            unitPrice: product.sellingPrice,
            costPrice: product.purchasePrice,
            subtotal: Number(
              (quantity * product.sellingPrice).toFixed(2)
            ),
          };
        });

        const subtotal = items.reduce(
          (total, item) => total + item.subtotal,
          0
        );

        const tax = Number(
          (subtotal * 0.0825).toFixed(2)
        );

        const total = Number(
          (subtotal + tax).toFixed(2)
        );

        const paymentMethods = [
          'CASH',
          'CREDIT_CARD',
          'DEBIT_CARD',
          'UPI',
        ];

        const paymentMethod =
          paymentMethods[
            Math.floor(Math.random() * paymentMethods.length)
          ];

        saleDate.setHours(
          9 + Math.floor(Math.random() * 11),
          Math.floor(Math.random() * 60)
        );

        salesRecords.push({
          businessId: business._id,

          transactionId:
            `TXN-${saleDate.getFullYear()}` +
            `${String(saleDate.getMonth() + 1).padStart(2, '0')}` +
            `${String(saleDate.getDate()).padStart(2, '0')}-` +
            `${1000 + salesRecords.length}`,

          items,
          subtotal,
          discount: 0,
          tax,
          total,
          paymentMethod,
          status: 'COMPLETED',

          cashierId:
            Math.random() > 0.4
              ? staffUser._id
              : adminUser._id,

          customerName: [
            'Walk-in Customer',
            'Alice Morgan',
            'Robert King',
            'Tech Solutions Corp',
            'Maria Garcia',
          ][Math.floor(Math.random() * 5)],

          createdAt: new Date(saleDate),
          updatedAt: new Date(saleDate),
        });
      }
    }

    await Sale.insertMany(salesRecords);

    console.log(
      `[Seeder] Generated ${salesRecords.length} sales transactions.`
    );

    // Generate predictive restocking recommendations.
    console.log('[Seeder] Calculating predictions...');

    const predictions = await calculateProductPrediction(
      business._id,
      null,
      30
    );

    console.log(
      `[Seeder] Generated ${predictions.length} predictions.`
    );

    console.log('\n==============================================');
    console.log(' SMARTSTOCK SEEDING COMPLETED SUCCESSFULLY');
    console.log('==============================================');
    console.log(`Business Name: ${business.name}`);
    console.log(`Admin Login: ${demoAdminEmail}`);
    console.log(`Staff Login: ${demoStaffEmail}`);
    console.log('Password: Password123!');
    console.log('==============================================\n');

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error(
      '[Seeder Error] Seed operation failed:',
      error
    );

    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
};

seedDatabase();
