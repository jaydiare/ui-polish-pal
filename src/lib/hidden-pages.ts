// Pages temporarily hidden from visitors. Remove a path to bring the page back.
export const HIDDEN_PAGES = ["/market-data", "/checklist-intel", "/mlb-venezuelan-leaders"];
export const isHiddenPage = (path: string) => HIDDEN_PAGES.includes(path);
