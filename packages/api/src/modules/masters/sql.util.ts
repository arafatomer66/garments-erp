/**
 * Convert a partial DTO into ($1, $2, …) placeholders + matching values for an
 * UPDATE statement. Only known column names are accepted to prevent injection
 * via field name; values are always parameterized.
 */
export function buildUpdate(
  allowedFields: readonly string[],
  data: Record<string, unknown>,
): { setClause: string; values: unknown[] } {
  const entries = Object.entries(data).filter(
    ([k, v]) => allowedFields.includes(k) && v !== undefined,
  );
  if (entries.length === 0) {
    return { setClause: '', values: [] };
  }
  const setParts = entries.map(([k], i) => `${snake(k)} = $${i + 1}`);
  const values = entries.map(([, v]) => v);
  return { setClause: setParts.join(', '), values };
}

export function snake(camel: string): string {
  return camel.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
}

export function camelize<T extends Record<string, unknown>>(row: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    const key = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    out[key] = v;
  }
  return out;
}
