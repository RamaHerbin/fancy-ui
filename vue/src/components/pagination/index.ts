// `pagination-range.ts` is deliberately NOT re-exported here: this file is
// the folder's barrel, and `vue/src/index.ts` re-exports it wholesale onto
// the public npm surface. `buildPageRange`/`PageItem` stay an internal
// implementation detail — import them from
// `./pagination-range.js` directly (as the colocated test does) if you need
// them outside this component.
export { default as Pagination } from "./Pagination.vue";
export type { PaginationProps } from "./Pagination.vue";
