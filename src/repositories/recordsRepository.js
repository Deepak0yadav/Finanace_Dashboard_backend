class RecordsRepository {
  constructor(store) {
    this.store = store;
  }

  toDomainRecord(document) {
    if (!document) {
      return null;
    }

    const { _id: _ignored, ...record } = document;
    return record;
  }

  async list() {
    if (this.store.kind === "mongo") {
      const records = await this.store.collection("records").find({}).toArray();
      return records.map((entry) => this.toDomainRecord(entry));
    }

    return structuredClone(this.store.state.records);
  }

  async findById(recordId) {
    if (this.store.kind === "mongo") {
      return this.toDomainRecord(await this.store.collection("records").findOne({ id: recordId }));
    }

    const record = this.store.state.records.find((entry) => entry.id === recordId);
    return record ? structuredClone(record) : null;
  }

  async countAll() {
    if (this.store.kind === "mongo") {
      return this.store.collection("records").countDocuments({});
    }

    return this.store.state.records.length;
  }

  async save(record) {
    if (this.store.kind === "mongo") {
      const nextRecord = this.toDomainRecord(record);
      await this.store
        .collection("records")
        .replaceOne({ id: nextRecord.id }, nextRecord, { upsert: true });
      return { ...nextRecord };
    }

    const nextRecord = structuredClone(record);

    const index = this.store.state.records.findIndex((entry) => entry.id === nextRecord.id);

    if (index === -1) {
      this.store.state.records.push(nextRecord);
    } else {
      this.store.state.records[index] = nextRecord;
    }

    await this.store.save();
    return structuredClone(nextRecord);
  }

  async remove(recordId) {
    if (this.store.kind === "mongo") {
      const result = await this.store.collection("records").deleteOne({ id: recordId });
      return result.deletedCount > 0;
    }

    const index = this.store.state.records.findIndex((entry) => entry.id === recordId);
    if (index === -1) {
      return false;
    }

    this.store.state.records.splice(index, 1);
    await this.store.save();
    return true;
  }
}

module.exports = {
  RecordsRepository,
};
