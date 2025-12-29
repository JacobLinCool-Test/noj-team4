export type Announcement = {
  id: number;
  courseId: number;
  title: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  author: {
    id: number;
    username: string;
    nickname: string | null;
  };
  canEdit: boolean;
  canDelete: boolean;
};
