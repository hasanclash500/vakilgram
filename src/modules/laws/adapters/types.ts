export interface LawArticleInput {
  number: string;
  title?: string | null;
  text: string;
  sourceUrl?: string | null;
}

export interface LawDocumentInput {
  title: string;
  slug: string;
  sourceUrl?: string | null;
  enactedAt?: string | null;
  effectiveAt?: string | null;
  articles: LawArticleInput[];
  metadata?: Record<string, unknown>;
}

export interface LawSourceAdapter<TInput = unknown> {
  readonly name: string;
  parse(input: TInput): Promise<LawDocumentInput[]>;
}
