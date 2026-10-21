// A static app: every screen is prerendered to HTML, then hydrated. Data
// comes from the in-memory API after mount (src/lib/data/api.ts), never
// during the build.
export const prerender = true;
export const trailingSlash = "never";
