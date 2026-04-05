const { MongoClient } = require("mongodb");

class MongoStore {
      constructor({ uri, dbName }) {
            this.kind = "mongo";
            this.uri = uri;
            this.dbName = dbName;
            this.client = null;
            this.db = null;
      }

      async load() {
            this.client = new MongoClient(this.uri, {
                  maxPoolSize: 10,
            });

            await this.client.connect();
            this.db = this.client.db(this.dbName);

            // Basic indexes keep user uniqueness and common record queries efficient.
            await Promise.all([
                  this.db.collection("users").createIndex({ email: 1 }, { unique: true }),
                  this.db.collection("records").createIndex({ date: -1, createdAt: -1 }),
                  this.db.collection("records").createIndex({ type: 1 }),
                  this.db.collection("records").createIndex({ category: 1 }),
            ]);
      }

      collection(name) {
            if (!this.db) {
                  throw new Error("MongoStore is not connected");
            }

            return this.db.collection(name);
      }

      async close() {
            if (this.client) {
                  await this.client.close();
                  this.client = null;
                  this.db = null;
            }
      }
}

module.exports = {
      MongoStore,
};
