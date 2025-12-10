import type { AppUser, UserStats } from '../types/admin';

const USERS_STORAGE_KEY = 'payday-users';

export const getAllUsers = (): AppUser[] => {
  const usersJson = localStorage.getItem(USERS_STORAGE_KEY);
  if (!usersJson) return [];

  try {
    return JSON.parse(usersJson);
  } catch {
    return [];
  }
};

export const createUser = (username: string): void => {
  const users = getAllUsers();

  // Check if user already exists
  if (users.some(u => u.username === username)) {
    throw new Error('User already exists');
  }

  const newUser: AppUser = {
    username,
    createdAt: new Date().toISOString(),
    lastLogin: null,
  };

  users.push(newUser);
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
};

export const deleteUser = (username: string): void => {
  const users = getAllUsers();
  const filteredUsers = users.filter(u => u.username !== username);
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(filteredUsers));

  // Also clean up user's data
  localStorage.removeItem(`payday-${username}`);
};

export const updateUserLastLogin = (username: string): void => {
  const users = getAllUsers();
  const user = users.find(u => u.username === username);

  if (user) {
    user.lastLogin = new Date().toISOString();
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } else {
    // Create user if doesn't exist (for existing users before admin portal)
    createUser(username);
    updateUserLastLogin(username);
  }
};

export const getUserStats = (): UserStats => {
  const users = getAllUsers();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);

  return {
    totalUsers: users.length,
    activeToday: users.filter(u => {
      if (!u.lastLogin) return false;
      const loginDate = new Date(u.lastLogin);
      return loginDate >= todayStart;
    }).length,
    activeThisWeek: users.filter(u => {
      if (!u.lastLogin) return false;
      const loginDate = new Date(u.lastLogin);
      return loginDate >= weekStart;
    }).length,
  };
};

export const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'Never';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return date.toLocaleDateString();
};
