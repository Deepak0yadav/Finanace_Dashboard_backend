function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

async function toRecordResponse(record, usersRepository) {
  const creator = await usersRepository.findById(record.createdBy);

  return {
    id: record.id,
    amount: record.amount,
    type: record.type,
    category: record.category,
    date: record.date,
    notes: record.notes,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    createdBy: creator
      ? {
        id: creator.id,
        name: creator.name,
        email: creator.email,
        role: creator.role,
      }
      : {
        id: record.createdBy,
      },
  };
}

module.exports = {
  toPublicUser,
  toRecordResponse,
};
