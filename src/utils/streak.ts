export function toStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function buildActiveDays(): Set<string> {
  const set  = new Set<string>();
  const base = new Date();

  for (let i = 0; i <= 6; i++) {
    const d = new Date(base); d.setDate(d.getDate() - i); set.add(toStr(d));
  }
  for (let i = 8; i <= 21; i++) {
    const d = new Date(base); d.setDate(d.getDate() - i); set.add(toStr(d));
  }
  for (let i = 24; i <= 55; i += 3) {
    const d = new Date(base); d.setDate(d.getDate() - i); set.add(toStr(d));
  }
  return set;
}

export function computeStreaks(days: Set<string>): { current: number; longest: number } {
  const today = new Date();
  let current = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    if (days.has(toStr(d))) current++; else break;
  }

  const sorted = Array.from(days).sort();
  let longest = 0, run = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0) { run = 1; }
    else {
      const prev = new Date(sorted[i-1]), curr = new Date(sorted[i]);
      const gap  = (curr.getTime() - prev.getTime()) / 86400000;
      run = gap === 1 ? run + 1 : 1;
    }
    longest = Math.max(longest, run);
  }
  return { current, longest };
}
