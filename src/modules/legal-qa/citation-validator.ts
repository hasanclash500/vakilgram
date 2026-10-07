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
