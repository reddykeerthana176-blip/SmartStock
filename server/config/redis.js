const config = require('./env');

class MemoryCacheFallback {
  constructor() {
    this.store = new Map();
    this.isReady = true;
    console.log('[Cache] Using High-Performance In-Memory Cache (Redis optional).');
  }

  async get(key) {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key, value, mode, duration) {
    let expiresAt = null;
    if (mode === 'EX' && duration) {
      expiresAt = Date.now() + duration * 1000;
    }
    this.store.set(key, { value, expiresAt });
    return 'OK';
  }

  async del(key) {
    return this.store.delete(key) ? 1 : 0;
  }

  async flushall() {
    this.store.clear();
    return 'OK';
  }
}

let redisClient = null;

try {
  // If ioredis is installed and host is reachable
  const Redis = require('ioredis');
  const client = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null // don't loop endlessly if redis is not running
  });

  client.connect().then(() => {
    console.log('[Cache] Redis Connected successfully.');
    redisClient = client;
  }).catch(() => {
    // Graceful fallback to memory cache
    redisClient = new MemoryCacheFallback();
  });
} catch {
  redisClient = new MemoryCacheFallback();
}

module.exports = redisClient || new MemoryCacheFallback();
