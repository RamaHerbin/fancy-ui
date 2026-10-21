// "auto" prerenders every docs page that has an entry, exactly like `true`, but
// lets an unknown /docs/* URL render at request time. With `true` the server
// answers those with the root error page, so the sidebar and search would be
// lost on a mistyped component name.
export const prerender = "auto";
