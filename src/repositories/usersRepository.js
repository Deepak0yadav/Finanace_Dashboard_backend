class UsersRepository {
  constructor(store) {
    this.store = store;
  }

  list() {
    return structuredClone(this.store.state.users);
  }

  findById(userId) {
    const user = this.store.state.users.find((entry) => entry.id === userId);
    return user ? structuredClone(user) : null;
  }

  findByEmail(email) {
    const loweredEmail = String(email || "").toLowerCase();
    const user = this.store.state.users.find((entry) => entry.email === loweredEmail);
    return user ? structuredClone(user) : null;
  }

  countActiveAdmins() {
    return this.store.state.users.filter(
      (entry) => entry.role === "admin" && entry.status === "active",
    ).length;
  }

  async save(user) {
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
