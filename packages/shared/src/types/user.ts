export type Gender = 'MALE' | 'FEMALE';

export type Education =
  | 'HIGH_SCHOOL'
  | 'ASSOCIATE'
  | 'BACHELOR'
  | 'MASTER'
  | 'PHD';

export type VerificationLevel = 'L1' | 'L2' | 'L3' | 'L4';

export type MembershipPlan = 'FREE' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export type IncomeRange =
  | 'BELOW_5K'
  | 'K5_10'
  | 'K10_20'
  | 'K20_50'
  | 'ABOVE_50K';

export interface PhotoItem {
  id: string;
  url: string;
  order: number;
  isAvatar: boolean;
}

export interface PromptItem {
  id: string;
  questionId: string;
  answerText?: string;
  answerAudioUrl?: string;
  answerVideoUrl?: string;
  order: number;
}

export interface UserProfile {
  id: string;
  nickname: string;
  gender: Gender;
  birthday: string;
  city: string;
  bio?: string;
  height?: number;
  education?: Education;
  occupation?: string;
  incomeRange?: IncomeRange;
  hometown?: string;
  zodiac?: string;
  mbti?: string;
  verificationLevel: VerificationLevel;
  photos: PhotoItem[];
  prompts: PromptItem[];
  tags: string[];
  isOnline: boolean;
  lastActiveAt: string;
  age: number;
}
