import { cn } from "fancy-ui-react";

interface Props {
	/** e.g. "01" — rendered as "( 01 )" in accent. Omit for the parens-label style. */
	index?: string;
	label: string;
	/** optional right-aligned counter, e.g. "6 PROJECTS" (rule variant only) */
	counter?: string;
	/** "rule" — section header with a flex filler line (default); "eyebrow" — compact inline eyebrow */
	variant?: "rule" | "eyebrow";
	className?: string;
}

export function SectionLabel({ index, label, counter, variant = "rule", className }: Props) {
	if (variant === "eyebrow") {
		return (
			<div className={cn("text-accent-work font-mono text-[11px] tracking-[0.14em]", className)}>
				{index ? `( ${index} )  ` : null}
				<span>{label}</span>
			</div>
		);
	}

	return (
		<div
			className={cn(
				"text-muted-foreground flex items-baseline gap-4 font-mono text-[11px] tracking-[0.14em]",
				className
			)}
		>
			{index ? (
				<>
					<span className="text-accent-work">( {index} )</span>
					<span>{label}</span>
				</>
			) : (
				<span className="text-accent-work">
					( <span>{label}</span> )
				</span>
			)}
			<span className="border-border/50 -translate-y-[3px] flex-1 border-b" />
			{counter ? <span>{counter}</span> : null}
		</div>
	);
}
