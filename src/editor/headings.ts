export interface Heading {
  level: number;
  text: string;
  pos: number;
}

/** Extract ATX headings, skipping fenced code blocks. */
export function extractHeadings(doc: string): Heading[] {
  const headings: Heading[] = [];
  let pos = 0;
  let inFence = false;

  for (const line of doc.split("\n")) {
    const fence = /^\s*(```|~~~)/.test(line);
    if (fence) inFence = !inFence;
    if (!inFence) {
      const m = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
      if (m) {
        headings.push({
          level: m[1].length,
          text: m[2] || "(untitled)",
          pos,
        });
      }
    }
    pos += line.length + 1;
  }
  return headings;
}
