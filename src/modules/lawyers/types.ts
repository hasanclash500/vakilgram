export interface LawyerRecommendation {
  id: string;
  slug: string;
  fullName: string;
  city: string;
  province: string | null;
  avatarUrl: string | null;
  verified: boolean;
  specialties: string[];
  sponsored: boolean;
  tierName: string | null;
  rating: number | null;
  reviewCount: number;
}

export interface LawyerRecommendationSet {
  featured: LawyerRecommendation[];
  others: LawyerRecommendation[];
}
