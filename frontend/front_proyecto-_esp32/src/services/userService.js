const USERS_STORAGE_KEY = 'demoUsers';

const initialUsers = [
  { id: 1, name: 'Juan Pérez', username: 'juan', role: 'admin' },
  { id: 2, name: 'María López', username: 'maria', role: 'editor' },
  { id: 3, name: 'Carlos Díaz', username: 'carlos', role: 'viewer' }
];

const loadUsers = () => {
  try {
    const stored = localStorage.getItem(USERS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore
  }
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(initialUsers));
  return initialUsers;
};

const saveUsers = (users) => {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
};

const delay = (value) => new Promise((resolve) => setTimeout(() => resolve(value), 250));

export async function getUsers() {
  return delay(loadUsers());
}

export async function createUser(userData) {
  const users = loadUsers();
  const nextId = users.length ? Math.max(...users.map((user) => user.id)) + 1 : 1;
  const newUser = { id: nextId, ...userData };
  const updated = [...users, newUser];
  saveUsers(updated);
  return delay(newUser);
}

export async function updateUser(userId, updates) {
  const users = loadUsers();
  const updated = users.map((user) =>
    user.id === userId ? { ...user, ...updates } : user
  );
  saveUsers(updated);
  return delay(updated.find((user) => user.id === userId));
}

export async function deleteUser(userId) {
  const users = loadUsers();
  const updated = users.filter((user) => user.id !== userId);
  saveUsers(updated);
  return delay(true);
}
