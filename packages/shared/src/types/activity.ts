export interface ActivityItem {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  category: string;
  location: string;
  startTime: string;
  maxMale: number;
  maxFemale: number;
  currentMale: number;
  currentFemale: number;
  fee: number;
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
}

export interface ActivitySignupItem {
  id: string;
  activityId: string;
  userId: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
}
