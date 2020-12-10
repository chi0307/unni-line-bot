const redis = require('redis');

class Redis {
  connect() {
    return redis.createClient({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      password: process.env.REDIS_PASSWORD || undefined,
      prefix: process.env.NODE_ENV + '/',
    });
  }

  quit(redisClient) {
    redisClient.quit();
  }

  async get(key) {
    let redisClient = await this.connect();
    return new Promise((resolve, reject) => {
      redisClient.get(key, (err, result) => {
        if (err) {
          console.error(err);
          reject(err);
        } else {
          resolve(result);
        }
      });
    }).finally(() => {
      this.quit(redisClient);
    });
  }

  async set(key, value) {
    let redisClient = await this.connect();
    return new Promise((resolve, reject) => {
      redisClient.set(key, value, (err) => {
        if (err) {
          console.error(err);
          reject(err);
        } else {
          resolve(key);
        }
      });
    }).finally(() => {
      this.quit(redisClient);
    });
  }
}

module.exports = new Redis();
