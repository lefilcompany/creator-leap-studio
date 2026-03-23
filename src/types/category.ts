export interface ActionCategory {
  id: string;
  name: string;
  description: string | null;
  color: string;
  user_id: string;
  team_id: string | null;
  visibility: 'personal' | 'team';
  created_at: string;
  updated_at: string;
}

export interface ActionCategoryMember {
  id: string;
  category_id: string;
  user_id: string;
  role: 'viewer' | 'editor';
  created_at: string;
}

export interface ActionCategoryItem {
  id: string;
  category_id: string;
  action_id: string;
  added_by: string;
  created_at: string;
}

export interface CategoryWithCount extends ActionCategory {
  action_count: number;
  member_count: number;
}
