class RecordsRepository {
  constructor(store) {
    this.store = store;
  }

  list() {
    return structuredClone(this.store.state.records);
  }

  findById(recordId) {
    const record = this.store.state.records.find((entry) => entry.id === recordId);
    return record ? structuredClone(record) : null;
  }

  async save(record) {
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
