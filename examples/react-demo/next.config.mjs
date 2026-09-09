/** @type {import("next").NextConfig} */
const nextConfig = {
	// One route, no server: the whole home is prerendered into out/ at build time.
	output: "export",
	// The page uses plain <img>; this only keeps next/image from demanding a loader.
	images: { unoptimized: true },
};

export default nextConfig;
