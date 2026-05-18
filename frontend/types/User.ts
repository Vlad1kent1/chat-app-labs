export interface User {
  id: number;
  email: string;
  phone?: string | null;
  firstName: string;
  lastName?: string | null;
  username: string;
  avatarUrl?: string | null;
  fcmToken?: string | null;
  isOnline: boolean;
  lastSeen: string;
  createdAt: string;
  updatedAt: string;
}
