const MongoClient = require('mongodb').MongoClient;

const { MONGO_URI } = process.env;
const MONGO_DB = 'bot';
const MONGO_PREFIX = 'unniLineBot';
let client;

class Mongo {
  async connect() {
    client = new MongoClient(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
  }

  quit() {
    client.close();
  }

  async search({ collection, filter = {} }) {
    await this.connect();
    return new Promise((resolve, reject) => {
      client
        .db(MONGO_DB)
        .collection(`${MONGO_PREFIX}/${collection}`)
        .find(filter)
        .toArray(function (err, items) {
          if (err) reject(err);
          resolve(items);
        });
    })
      .catch((err) => console.error(err))
      .finally(() => {
        this.quit();
      });
  }

  async insertOne({ collection, doc }) {
    await this.connect();
    return new Promise((resolve, reject) => {
      client
        .db(MONGO_DB)
        .collection(`${MONGO_PREFIX}/${collection}`)
        .insertOne(doc, (err, result) => {
          if (err) reject(err);
          resolve(result);
        });
    })
      .then((result) => result.ops)
      .catch((err) => console.error(err))
      .finally(() => {
        this.quit();
      });
  }

  async replaceOne({ collection, filter, doc }) {
    await this.connect();
    return new Promise((resolve, reject) => {
      client
        .db(MONGO_DB)
        .collection(`${MONGO_PREFIX}/${collection}`)
        .replaceOne(filter, doc, (err, result) => {
          if (err) reject(err);
          resolve(result);
        });
    })
      .then((result) => result.ops)
      .catch((err) => console.error(err))
      .finally(() => {
        this.quit();
      });
  }

  async deleteMany({ collection, filter }) {
    await this.connect();
    return new Promise((resolve, reject) => {
      client
        .db(MONGO_DB)
        .collection(`${MONGO_PREFIX}/${collection}`)
        .deleteMany(filter, (err, result) => {
          if (err) reject(err);
          resolve(result);
        });
    })
      .then((result) => result.deletedCount)
      .catch((err) => console.error(err))
      .finally(() => {
        this.quit();
      });
  }
}

module.exports = new Mongo();
