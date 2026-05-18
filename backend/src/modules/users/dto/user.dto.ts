// DTO for returning user data to the client.
export class UserDto {
  id!: number;
  email!: string;
  phone!: string;
  firstName!: string;
  lastName?: string;
  username!: string;
  avatarUrl?: string;
  fcmToken?: string;
  isOnline!: boolean;
  lastSeen!: Date;
  createdAt!: Date;
  updatedAt!: Date;
}
