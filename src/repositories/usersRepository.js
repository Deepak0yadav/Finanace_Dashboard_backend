class UsersRepository {
  constructor(store) {
    this.store = store;
  }

  toDomainUser(document) {
    if (!document) {
      return null;
    }

    const { _id: _ignored, ...user } = document;
    return user;
  }

  async list() {
    if (this.store.kind === "mongo") {
      const users = await this.store.collection("users").find({}).toArray();
      return users.map((entry) => this.toDomainUser(entry));
    }

    return structuredClone(this.store.state.users);
  }

  async findById(userId) {
    if (this.store.kind === "mongo") {
      return this.toDomainUser(await this.store.collection("users").findOne({ id: userId }));
    }

    const user = this.store.state.users.find((entry) => entry.id === userId);
    return user ? structuredClone(user) : null;
  }

  async findByEmail(email) {
    const loweredEmail = String(email || "").toLowerCase();
    if (this.store.kind === "mongo") {
      return this.toDomainUser(
        await this.store.collection("users").findOne({ email: loweredEmail }),
      );
    }

    const user = this.store.state.users.find((entry) => entry.email === loweredEmail);
    return user ? structuredClone(user) : null;
  }

  async countActiveAdmins() {
    if (this.store.kind === "mongo") {
      return this.store.collection("users").countDocuments({ role: "admin", status: "active" });
    }

    return this.store.state.users.filter(
      (entry) => entry.role === "admin" && entry.status === "active",
    ).length;
  }

  async countAll() {
    if (this.store.kind === "mongo") {
      return this.store.collection("users").countDocuments({});
    }

    return this.store.state.users.length;
  }

  async save(user) {
    if (this.store.kind === "mongo") {
      const nextUser = this.toDomainUser(user);
      await this.store.collection("users").replaceOne({ id: nextUser.id }, nextUser, { upsert: true });
      return { ...nextUser };
    }

    const nextUser = structuredClone(user);

    const index = this.store.state.users.findIndex((entry) => entry.id === nextUser.id);

    if (index === -1) {
      this.store.state.users.push(nextUser);
    } else {
      this.store.state.users[index] = nextUser;
    }

    await this.store.save();
    return structuredClone(nextUser);
  }
}

module.exports = {
  UsersRepository,
};
