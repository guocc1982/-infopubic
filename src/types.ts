export interface Category {
  id: number;
  name: string;
  parent_id: number | null;
  description: string;
  display_order: number;
  is_published: boolean;
  icon: string;
}

export interface Article {
  id: number;
  title: string;
  subtitle: string;
  category_id: number;
  category_name?: string;
  summary: string;
  content: string;
  thumbnail_url: string;
  status: 'draft' | 'pending' | 'published' | 'archived';
  publish_date: string;
  view_count: number;
  reading_time: number;
  author?: string;
  allow_anonymous: boolean;
  allow_all_registered: boolean;
  allowed_roles?: string;
  allowed_users?: string;
}

export interface Comment {
  id: number;
  article_id: number;
  author: string;
  content: string;
  created_at: string;
}
