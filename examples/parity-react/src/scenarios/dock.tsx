// Mirrors src/lib/components/docs/examples/dock/BasicUsage.svelte.
// Icons are inline copies of the lucide nodes the Svelte demo imports (no icon package in this app).
import type { ReactNode } from "react";
import { Dock, DockIcon, DockSeparator } from "fancy-ui-react";

function Icon({ name, children }: { name: string; children: ReactNode }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={24}
			height={24}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={1.6}
			strokeLinecap="round"
			strokeLinejoin="round"
			className={`lucide-icon lucide lucide-${name} size-[46%]`}
		>
			{children}
		</svg>
	);
}

const apps = [
	{
		label: "Home",
		icon: (
			<Icon name="house">
				<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
				<path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
			</Icon>
		),
	},
	{
		label: "Search",
		icon: (
			<Icon name="search">
				<path d="m21 21-4.34-4.34" />
				<circle cx="11" cy="11" r="8" />
			</Icon>
		),
	},
	{
		label: "Inbox",
		icon: (
			<Icon name="inbox">
				<polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
				<path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
			</Icon>
		),
	},
	{
		label: "Calendar",
		icon: (
			<Icon name="calendar">
				<path d="M8 2v4" />
				<path d="M16 2v4" />
				<rect width="18" height="18" x="3" y="4" rx="2" />
				<path d="M3 10h18" />
			</Icon>
		),
	},
	{
		label: "Music",
		icon: (
			<Icon name="music">
				<path d="M9 18V5l12-2v13" />
				<circle cx="6" cy="18" r="3" />
				<circle cx="18" cy="16" r="3" />
			</Icon>
		),
	},
];
const system = [
	{
		label: "Settings",
		icon: (
			<Icon name="settings">
				<path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" />
				<circle cx="12" cy="12" r="3" />
			</Icon>
		),
	},
	{
		label: "Trash",
		icon: (
			<Icon name="trash-2">
				<path d="M10 11v6" />
				<path d="M14 11v6" />
				<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
				<path d="M3 6h18" />
				<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
			</Icon>
		),
	},
];

// One tile look for every app: a squircle with a top-lit face and a hairline.
const tile =
	"grid size-full place-items-center rounded-[30%] border border-black/[0.07] bg-gradient-to-b from-white to-zinc-100 text-zinc-700 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_1px_2px_rgba(0,0,0,0.06)] outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/60 dark:border-white/[0.08] dark:from-[#26262a] dark:to-[#141416] dark:text-zinc-200 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_1px_2px_rgba(0,0,0,0.6)]";

export default function Scenario() {
	return (
		<div className="w-full max-w-2xl rounded-[22px] border border-black/[0.06] bg-black/[0.015] p-1.5 dark:border-white/[0.06] dark:bg-white/[0.02]">
			<div className="relative flex h-64 items-end justify-center overflow-hidden rounded-2xl border border-black/[0.06] bg-[#fafafa] pb-10 dark:border-white/[0.06] dark:bg-[#0b0b0c]">
				<div
					aria-hidden="true"
					className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-[radial-gradient(60%_70%_at_50%_100%,rgba(0,0,0,0.045),transparent)] dark:bg-[radial-gradient(60%_70%_at_50%_100%,rgba(255,255,255,0.05),transparent)]"
				></div>
				<Dock direction="bottom" ariaLabel="Applications">
					{apps.map((app) => (
						<DockIcon key={app.label}>
							<button type="button" className={tile} aria-label={app.label} title={app.label}>
								{app.icon}
							</button>
						</DockIcon>
					))}
					<DockSeparator />
					{system.map((app) => (
						<DockIcon key={app.label}>
							<button type="button" className={tile} aria-label={app.label} title={app.label}>
								{app.icon}
							</button>
						</DockIcon>
					))}
				</Dock>
			</div>
		</div>
	);
}
