const redis = require('redis');

let redisClient;

class Redis {
  connect() {
    redisClient = redis.createClient({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      password: process.env.REDIS_PASSWORD || undefined,
      prefix: process.env.NODE_ENV + '/',
    });
  }

  get(key) {
    this.connect();
    return new Promise((resolve, reject) => {
      redisClient.get(key, (err, result) => {
        if (err) {
          console.error(err);
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

  set(key, value) {
    this.connect();
    return new Promise((resolve, reject) => {
      redisClient.set(key, value, (err) => {
        if (err) {
          console.error(err);
          reject(err);
        } else {
          resolve(key);
        }
      });
    });
  }

  quit() {
    redisClient.quit();
  }
}

module.exports = new Redis();
