// Mirrors src/lib/components/docs/examples/dim-siblings/BasicUsage.svelte.
import { DimSiblings } from "fancy-ui-react";

const COLUMNS = [
	{ heading: "Product", links: ["Overview", "Pricing", "Changelog"] },
	{ heading: "Docs", links: ["Guides", "API reference", "Examples"] },
	{ heading: "Company", links: ["About", "Careers", "Blog"] },
	{ heading: "Legal", links: ["Privacy", "Terms", "Security"] },
];

export default function Scenario() {
	return (
		<div className="w-full p-6">
			<DimSiblings as="footer" className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
				{COLUMNS.map((column) => (
					<div key={column.heading}>
						<h3 className="text-foreground text-sm font-semibold">{column.heading}</h3>
						<ul className="mt-3 flex flex-col gap-2">
							{column.links.map((link) => (
								<li key={link}>
									<a
										href={`#${link.toLowerCase().replace(/\s+/g, "-")}`}
										className="text-muted-foreground hover:text-foreground text-sm"
									>
										{link}
									</a>
								</li>
							))}
						</ul>
					</div>
				))}
			</DimSiblings>
			<p className="text-muted-foreground mt-4 text-xs">
				Hover any link, or Tab to it — the other three columns dim so the one you're in stands out.
			</p>
		</div>
	);
}
