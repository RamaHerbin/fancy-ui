import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
	title: "fancy-ui-react example",
	description: "Next.js App Router integration check for fancy-ui-react",
};

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	);
}
