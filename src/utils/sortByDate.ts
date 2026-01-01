/**
 * Sort an array of items by date in descending order (newest first)
 * @param items - Array of items with a date property
 * @param dateKey - The property name containing the date (default: 'pubDate')
 * @returns Sorted array
 */
export function sortByDate<T extends Record<string, any>>(
  items: T[],
  dateKey: string = 'pubDate'
): T[] {
  return items.sort((a, b) => {
    const dateA = a[dateKey] instanceof Date ? a[dateKey] : new Date(a[dateKey]);
    const dateB = b[dateKey] instanceof Date ? b[dateKey] : new Date(b[dateKey]);
    return dateB.getTime() - dateA.getTime();
  });
}

/**
 * Sort experiences by start date (most recent first)
 * Current roles always appear first
 */
export function sortExperiences<
  T extends { startDate: Date | string; current?: boolean }
>(items: T[]): T[] {
  return items.sort((a, b) => {
    // Current roles always come first
    if (a.current && !b.current) return -1;
    if (!a.current && b.current) return 1;

    // Otherwise sort by start date (newest first)
    const dateA = a.startDate instanceof Date ? a.startDate : new Date(a.startDate);
    const dateB = b.startDate instanceof Date ? b.startDate : new Date(b.startDate);
    return dateB.getTime() - dateA.getTime();
  });
}
