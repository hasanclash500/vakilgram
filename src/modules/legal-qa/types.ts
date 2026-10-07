export type AnswerMode = "simple" | "expert";

export interface RetrievedArticle {
  id: string;
  lawId: string;
  lawTitle: string;
  lawStatus: string;
  number: string;
  title: string | null;
  text: string;
  sourceUrl: string | null;
  rank: number;
}

export interface LegalSource {
  articleId: string;
  lawTitle: string;
  lawStatus: string;
  articleNumber: string;
  articleTitle: string | null;
  text: string;
  sourceUrl: string | null;
}

export interface LegalAnswer {
  answer: string;
  summary: string;
  legalArea: string | null;
  sources: LegalSource[];
  lawyers: import("@/modules/lawyers/types").LawyerRecommendationSet;
  disclaimer: string;
  documented: boolean;
}
