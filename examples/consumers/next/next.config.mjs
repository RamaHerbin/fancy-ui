import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const nextConfig = {
	// The consumer is its own project root, whatever repo it happens to sit in.
	outputFileTracingRoot: dirname(fileURLToPath(import.meta.url)),
};
export default nextConfig;
