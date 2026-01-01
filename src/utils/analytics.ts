/**
 * Google Analytics utility functions
 * These are optional helpers for custom event tracking
 */

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

/**
 * Track a custom event
 * @param eventName - Name of the event
 * @param eventParams - Optional parameters for the event
 */
export function trackEvent(eventName: string, eventParams?: Record<string, any>) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, eventParams);
  }
}

/**
 * Track page view (usually handled automatically by GA)
 * @param url - Page URL
 * @param title - Page title
 */
export function trackPageView(url: string, title: string) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'page_view', {
      page_location: url,
      page_title: title,
    });
  }
}

/**
 * Track outbound link clicks
 * @param url - Destination URL
 * @param label - Optional label for the link
 */
export function trackOutboundLink(url: string, label?: string) {
  trackEvent('click', {
    event_category: 'outbound',
    event_label: label || url,
    value: url,
  });
}

/**
 * Track project views
 * @param projectName - Name of the project
 */
export function trackProjectView(projectName: string) {
  trackEvent('view_item', {
    event_category: 'project',
    event_label: projectName,
  });
}

/**
 * Track blog post reads
 * @param postTitle - Title of the blog post
 * @param readingTime - Estimated reading time
 */
export function trackBlogRead(postTitle: string, readingTime?: string) {
  trackEvent('view_item', {
    event_category: 'blog',
    event_label: postTitle,
    value: readingTime,
  });
}
