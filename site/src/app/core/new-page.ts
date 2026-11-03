/** The path of a URL, without its query string or fragment. */
export const pathOf = (url: string): string => url.split(/[?#]/)[0];

/**
 * True when going from `previous` to `url` opens another page, so the window should start at the
 * top. A query change on the same page (the CRM country drawer) and an anchor jump (`#read`)
 * keep the scroll position.
 */
export function opensNewPage(previous: string | null, url: string): boolean {
  return previous !== null && pathOf(previous) !== pathOf(url) && !url.includes('#');
}
