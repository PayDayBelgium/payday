export interface AdminUser {
  username: string;
  password: string;
}

export interface AppUser {
  username: string;
  createdAt: string;
  lastLogin: string | null;
}

export interface UserStats {
  totalUsers: number;
  activeToday: number;
  activeThisWeek: number;
}
