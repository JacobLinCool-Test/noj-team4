export class UserProfileDto {
  username: string;
  nickname: string | null;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: Date;
}
