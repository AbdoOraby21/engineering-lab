const WORDS_PER_MINUTE = 200;

export function readingTime(text: string): number {
  if (!text) {
    return 0;
  }
  const words = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/https?:\/\/[^\s]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0);
  const minutes = words.length / WORDS_PER_MINUTE;
  return Math.ceil(minutes);
}
