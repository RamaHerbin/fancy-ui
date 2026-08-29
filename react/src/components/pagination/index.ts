// `pagination-range.ts` is deliberately NOT re-exported here: this file is
// the folder's barrel, and the package barrel re-exports it wholesale
// straight onto the public npm surface. `buildPageRange`/`PageItem` stay an
// internal implementation detail — import them from
// `./pagination-range.js` directly (as the colocated test does) if you need
// them outside this component.
export { Pagination } from "./Pagination.js";
export type { PaginationProps } from "./Pagination.js";
