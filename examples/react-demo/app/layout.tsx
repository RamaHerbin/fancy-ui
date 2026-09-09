import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import pkg from "fancy-ui-react/package.json";
import { ScrollBlurOverlay } from "@/components/ScrollBlurOverlay";
import { LIGHT_HEX, THEME_IIFE } from "@/lib/theme-script";
import { SITE_DESCRIPTION, SITE_NAME, SITE_ORIGIN, URLS } from "@/lib/site";

// Self-hosted at build time: no runtime font request, no preload dance, and it
// works under `output: "export"`. The variable feeds --app-font-sans in globals.css.
const bricolage = Bricolage_Grotesque({
	subsets: ["latin"],
	display: "swap",
	variable: "--font-bricolage",
	axes: ["opsz"],
});

const TITLE = `${SITE_NAME} — animated UI components for React`;

export const metadata: Metadata = {
	...(SITE_ORIGIN ? { metadataBase: new URL(SITE_ORIGIN), alternates: { canonical: "/" } } : {}),
	title: TITLE,
	description: SITE_DESCRIPTION,
	openGraph: {
		type: "website",
		siteName: SITE_NAME,
		locale: "en_US",
		title: TITLE,
		description: SITE_DESCRIPTION,
		...(SITE_ORIGIN ? { url: "/" } : {}),
	},
	twitter: { card: "summary", title: TITLE, description: SITE_DESCRIPTION },
	robots: { index: true, follow: true },
	icons: { icon: "/favicon.svg" },
};

const jsonLd = {
	"@context": "https://schema.org",
	"@type": "SoftwareApplication",
	name: SITE_NAME,
	applicationCategory: "DeveloperApplication",
	operatingSystem: "Web",
	softwareVersion: pkg.version,
	license: URLS.license,
	description: SITE_DESCRIPTION,
	sameAs: [URLS.npm, URLS.github],
	...(SITE_ORIGIN ? { url: SITE_ORIGIN } : {}),
};

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		// suppressHydrationWarning: the inline script below adds `.dark` before
		// React hydrates, so the class attribute legitimately differs from the
		// server HTML. It only covers this element's own attributes.
		<html lang="en" className={bricolage.variable} suppressHydrationWarning>
			<head>
				{/* Exactly one theme-color tag, holding the LIGHT value: the `dark`
				    class is only ever added by script, so a scripting-disabled visitor
				    renders :root (light). The script corrects it before first paint. */}
				<meta name="theme-color" content={LIGHT_HEX} />
				<script dangerouslySetInnerHTML={{ __html: THEME_IIFE }} />
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
				/>
			</head>
			<body>
				{children}
				<ScrollBlurOverlay />
			</body>
		</html>
	);
}
