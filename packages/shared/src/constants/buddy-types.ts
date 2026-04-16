export const BUDDY_TYPES = [
  { id: 'meal', label: '饭搭子', icon: 'restaurant-outline' },
  { id: 'sports', label: '运动搭子', icon: 'fitness-outline' },
  { id: 'travel', label: '旅行搭子', icon: 'airplane-outline' },
  { id: 'movies', label: '观影搭子', icon: 'film-outline' },
  { id: 'study', label: '学习搭子', icon: 'book-outline' },
  { id: 'other', label: '其他', icon: 'ellipsis-horizontal-outline' },
] as const;

export type BuddyType = (typeof BUDDY_TYPES)[number]['id'];

export const BUDDY_TYPE_COLORS: Record<BuddyType, string> = {
  meal: '#f97316',
  sports: '#22c55e',
  travel: '#3b82f6',
  movies: '#a855f7',
  study: '#eab308',
  other: '#6b7280',
};
