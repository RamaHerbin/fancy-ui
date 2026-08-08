// `pagination-range.ts` is deliberately NOT re-exported here: this file is
// the folder's barrel, and `src/lib/fancy-ui/index.ts` re-exports it
// wholesale (`export * from "./pagination/index.js"`) straight onto the
// public npm surface. `buildPageRange`/`PageItem` stay an internal
// implementation detail — import them from
// `$lib/fancy-ui/pagination/pagination-range.js` directly (as the colocated
// test does) if you need them outside this component.
import Pagination from "./Pagination.svelte";
import type { PaginationProps } from "./Pagination.svelte";

export { Pagination, type PaginationProps };
