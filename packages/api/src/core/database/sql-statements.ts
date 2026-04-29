/**
 * Split a SQL script into individual statements while respecting
 * dollar-quoted blocks (e.g. `$$ ... $$`, `$tag$ ... $tag$`) and
 * standard quoted strings. Line comments starting with `--` are stripped.
 *
 * The simpler `;\s*\n` split breaks plpgsql function bodies because
 * those contain semicolons inside the dollar-quoted body.
 */
export function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let i = 0;

  let inSingle = false;
  let inDouble = false;
  let dollarTag: string | null = null;

  while (i < sql.length) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (!inSingle && !inDouble && dollarTag === null && ch === '-' && next === '-') {
      while (i < sql.length && sql[i] !== '\n') i++;
      continue;
    }

    if (dollarTag === null && !inSingle && !inDouble && ch === '$') {
      const match = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i));
      if (match) {
        dollarTag = match[0];
        current += dollarTag;
        i += dollarTag.length;
        continue;
      }
    } else if (dollarTag !== null && sql.startsWith(dollarTag, i)) {
      current += dollarTag;
      i += dollarTag.length;
      dollarTag = null;
      continue;
    }

    if (dollarTag === null) {
      if (!inDouble && ch === "'") inSingle = !inSingle;
      else if (!inSingle && ch === '"') inDouble = !inDouble;
    }

    if (ch === ';' && !inSingle && !inDouble && dollarTag === null) {
      const trimmed = current.trim();
      if (trimmed.length > 0) statements.push(trimmed);
      current = '';
      i++;
      continue;
    }

    current += ch;
    i++;
  }

  const tail = current.trim();
  if (tail.length > 0) statements.push(tail);
  return statements;
}
