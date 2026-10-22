import type { ReactNode } from "react";
import "fancy-ui-react/styles.css";
import "./globals.css";

export const metadata = { title: "fancy-ui-react consumer" };

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en">
			<body className="bg-background text-foreground">{children}</body>
		</html>
	);
}
