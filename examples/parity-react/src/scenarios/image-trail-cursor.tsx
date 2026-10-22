// Mirrors src/lib/components/docs/examples/image-trail-cursor/BasicUsage.svelte.
import { useState } from "react";
import { ImageTrailCursor } from "fancy-ui-react";
import type { VariantType } from "fancy-ui-react";

const images = [
	"https://picsum.photos/seed/trail1/400/440",
	"https://picsum.photos/seed/trail2/400/440",
	"https://picsum.photos/seed/trail3/400/440",
	"https://picsum.photos/seed/trail4/400/440",
	"https://picsum.photos/seed/trail5/400/440",
	"https://picsum.photos/seed/trail6/400/440",
	"https://picsum.photos/seed/trail7/400/440",
	"https://picsum.photos/seed/trail8/400/440",
];

const variants: { type: VariantType; label: string }[] = [
	{ type: "type1", label: "Fade & Scale" },
	{ type: "type2", label: "Brightness" },
	{ type: "type3", label: "Float-up" },
	{ type: "type4", label: "Momentum" },
	{ type: "type5", label: "Rotation" },
	{ type: "type6", label: "Speed-reactive" },
	{ type: "type7", label: "Stacking" },
	{ type: "type8", label: "3D Perspective" },
	{ type: "pixelated", label: "Pixelated" },
	{ type: "scale", label: "Scale" },
	{ type: "fall", label: "Image fall" },
	{ type: "gravity", label: "Gravity" },
	{ type: "flame", label: "Flame" },
	{ type: "venetian", label: "Venetian" },
	{ type: "curtain", label: "Curtain" },
	{ type: "hexagon", label: "Hexagon" },
	{ type: "liquid", label: "Liquid" },
	{ type: "zoom-split", label: "Zoom split" },
];

export default function Scenario() {
	const [selectedVariant, setSelectedVariant] = useState<VariantType>("type1");

	return (
		<div className="w-full">
			<div className="mb-4 flex flex-wrap gap-2">
				{variants.map((v) => (
					<button
						key={v.type}
						className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
							selectedVariant === v.type
								? "border-primary bg-primary text-primary-foreground"
								: "border-border bg-card hover:bg-accent"
						}`}
						onClick={() => setSelectedVariant(v.type)}
					>
						{v.label}
					</button>
				))}
			</div>
			<div className="relative h-[500px] cursor-crosshair overflow-hidden rounded-lg border">
				<ImageTrailCursor images={images} variant={selectedVariant} />
				<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
					<p className="text-muted-foreground text-lg font-medium select-none">
						Move your cursor here
					</p>
				</div>
			</div>
		</div>
	);
}
