export interface Post {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  author: {
    id: string;
    name: string;
  };
}

export interface Analytics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
}