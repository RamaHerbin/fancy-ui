/**
 * Entry point of the self-hosted site (the image built by ../Dockerfile).
 *
 * The Node adapter serves prerendered pages and static files straight from
 * disk, before any SvelteKit hook runs, so response headers for those paths
 * cannot be set in `hooks.server.ts`. On the serverless target they come from
 * `vercel.json`; this wrapper applies the same rules from the same file.
 *
 * Environment: PORT (default 3000), HOST (default 0.0.0.0), plus everything
 * the Node adapter reads (ORIGIN, ADDRESS_HEADER, XFF_DEPTH, BODY_SIZE_LIMIT).
 */
import { createServer } from "node:http";
import { handler } from "../build/handler.js";
import { headersFor, loadHeaderRules } from "./headers.mjs";

const rules = loadHeaderRules(new URL("../vercel.json", import.meta.url));

const server = createServer((req, res) => {
	const pathname = (req.url ?? "/").split("?")[0];
	for (const [key, value] of headersFor(rules, pathname)) res.setHeader(key, value);
	handler(req, res, () => {
		res.statusCode = 404;
		res.end("Not found");
	});
});

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";
server.listen(port, host, () => console.log(`fancy-ui site listening on http://${host}:${port}`));

for (const signal of ["SIGTERM", "SIGINT"]) {
	process.on(signal, () => {
		server.close(() => process.exit(0));
		// Open keep-alive connections would hold the close forever.
		server.closeIdleConnections();
		setTimeout(() => process.exit(0), 10_000).unref();
	});
}
