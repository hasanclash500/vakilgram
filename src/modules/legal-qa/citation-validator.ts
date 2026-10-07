export interface CitedTextInput {
  text: string;
  articleIds: readonly string[];
}

export interface GroundedCitedText {
  text: string;
  articleIds: string[];
}

export function validateCitationIds(
  candidateIds: readonly string[],
  allowedIds: readonly string[]
): string[] {
  const allowed = new Set(allowedIds);
  const seen = new Set<string>();
  const result: string[] = [];

  for (const id of candidateIds) {
    if (!allowed.has(id) || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }

  return result;
}

export function groundCitedTexts(
  items: readonly CitedTextInput[],
  allowedIds: readonly string[]
): GroundedCitedText[] {
  return items.flatMap((item) => {
    const text = item.text.trim();
    const articleIds = validateCitationIds(item.articleIds, allowedIds);

    if (!text || articleIds.length === 0) return [];

    return [{ text, articleIds }];
  });
}

export function collectGroundedCitationIds(
  items: readonly GroundedCitedText[]
): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    for (const id of item.articleIds) {
      if (seen.has(id)) continue;
      seen.add(id);
      result.push(id);
    }
  }

  return result;
}
