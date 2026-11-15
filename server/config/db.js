const mongoose = require('mongoose');
const config = require('./env');

let isReplicaSet = false;

/**
 * Connect to MongoDB with production-grade connection pooling and retry settings
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongoUri, {
      maxPoolSize: config.mongoMaxPoolSize,
      minPoolSize: config.mongoMinPoolSize,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      autoIndex: config.nodeEnv !== 'production', // Don't build indexes automatically in high-scale prod
    });

    console.log(`[Database] MongoDB Connected: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);

    // Check replica set status for transaction support
    try {
      const adminDb = conn.connection.db.admin();
      const status = await adminDb.command({ replSetGetStatus: 1 }).catch(() => null);
      if (status && status.ok) {
        isReplicaSet = true;
        console.log('[Database] MongoDB Replica Set detected: Multi-document ACID transactions ENABLED.');
      } else {
        isReplicaSet = false;
        console.log('[Database] Standalone MongoDB detected: Atomic single-document operations active.');
      }
    } catch {
      isReplicaSet = false;
    }

    mongoose.connection.on('error', (err) => {
      console.error('[Database] MongoDB runtime connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[Database] MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('[Database] MongoDB successfully reconnected.');
    });

    return conn;
  } catch (error) {
    console.error(`[Database Error] Failed to connect to MongoDB: ${error.message}`);
    // In dev mode, don't immediately crash if MongoDB isn't running yet; provide helpful setup advice
    if (config.nodeEnv === 'production') {
      process.exit(1);
    }
  }
};

/**
 * Safe transaction helper:
 * If replica set is available, runs operation inside an ACID session transaction.
 * If standalone MongoDB (common in local dev), executes the operation callback directly.
 */
const executeTransaction = async (workFn) => {
  if (isReplicaSet) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const result = await workFn(session);
      await session.commitTransaction();
      session.endSession();
      return result;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } else {
    // Standalone fallback: execute without session
    return await workFn(null);
  }
};

module.exports = {
  connectDB,
  executeTransaction,
  getIsReplicaSet: () => isReplicaSet,
};
