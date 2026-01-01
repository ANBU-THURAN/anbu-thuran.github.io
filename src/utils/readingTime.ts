/**
 * Calculate reading time for markdown content
 * @param content - The markdown content string
 * @param wordsPerMinute - Average reading speed (default: 100)
 * @returns Formatted reading time string (e.g., "5 min read")
 */
export function calculateReadingTime(content: string, wordsPerMinute: number = 100): string {
  // Strip markdown syntax and HTML tags
  const cleanContent = content
    .replace(/`[^`]*`/g, '') // Remove inline code
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove links but keep text
    .replace(/[#*_~\[\]()]/g, '') // Remove markdown special characters
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  // Count words
  const wordCount = cleanContent.split(/\s+/).filter((word) => word.length > 0).length;

  // Calculate reading time
  const minutes = Math.ceil(wordCount / wordsPerMinute);

  // Format output
  if (minutes === 1) {
    return '1 min read';
  }
  return `${minutes} min read`;
}
