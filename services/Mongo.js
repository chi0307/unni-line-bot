const MongoClient = require('mongodb').MongoClient;

const uri = process.env.MONGO_URI;
const db = 'bot';
let client;

class Mongo {
  async connect() {
    client = new MongoClient(uri, { useNewUrlParser: true });
    await client.connect();
  }

  quit() {
    client.close();
  }

  async search({ collection, filter = {} }) {
    await this.connect();
    return new Promise((resolve, reject) => {
      client
        .db(db)
        .collection(collection)
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
        .db(db)
        .collection(collection)
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
        .db(db)
        .collection(collection)
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
        .db(db)
        .collection(collection)
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
