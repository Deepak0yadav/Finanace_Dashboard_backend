const fs = require("node:fs/promises");
const path = require("node:path");

const DEFAULT_STATE = {
  users: [],
  records: [],
};

class DataStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.state = structuredClone(DEFAULT_STATE);
    this.writeChain = Promise.resolve();
  }

  async load() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });

    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw);

      this.state = {
        users: Array.isArray(parsed.users) ? parsed.users : [],
        records: Array.isArray(parsed.records) ? parsed.records : [],
      };
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }

      this.state = structuredClone(DEFAULT_STATE);
      await this.save();
    }
  }

  async save() {
    const snapshot = JSON.stringify(this.state, null, 2);
    const tempFile = `${this.filePath}.tmp`;

    this.writeChain = this.writeChain.then(async () => {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      await fs.writeFile(tempFile, snapshot, "utf8");
      await fs.rename(tempFile, this.filePath);
    });

    return this.writeChain;
  }
}

module.exports = {
  DataStore,
};
