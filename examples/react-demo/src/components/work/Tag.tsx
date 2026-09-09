import { cn } from "fancy-ui-react";

export function Tag({ label, className }: { label: string; className?: string }) {
	return (
		<span
			className={cn(
				"border-border/70 text-foreground/85 inline-block rounded-full border px-2.5 py-0.5 font-mono text-[11px] whitespace-nowrap",
				className
			)}
		>
			{label}
		</span>
	);
}
