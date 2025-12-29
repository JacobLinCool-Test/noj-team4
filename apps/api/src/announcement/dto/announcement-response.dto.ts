export class AnnouncementResponseDto {
  id!: number;
  courseId!: number;
  title!: string;
  content!: string;
  isPinned!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
  author!: {
    id: number;
    username: string;
    nickname: string | null;
  };
  canEdit!: boolean;
  canDelete!: boolean;
}
