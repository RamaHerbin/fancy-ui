import { useState } from "react";
import { ImageTrailCursor, type VariantType } from "fancy-ui-react";

const images = [
	"https://picsum.photos/seed/trail1/400/440",
	"https://picsum.photos/seed/trail2/400/440",
	"https://picsum.photos/seed/trail3/400/440",
	"https://picsum.photos/seed/trail4/400/440",
];

const variants: { type: VariantType; label: string }[] = [
	{ type: "type1", label: "Fade & Scale" },
	{ type: "type3", label: "Float-up" },
	{ type: "type5", label: "Rotation" },
];

export function ImageTrailCursorExample() {
	const [variant, setVariant] = useState<VariantType>("type1");

	return (
		<div className="w-full">
			<div className="mb-4 flex flex-wrap gap-2">
				{variants.map((v) => (
					<button
						key={v.type}
						type="button"
						className="rounded-lg border px-3 py-1.5 text-sm"
						aria-pressed={variant === v.type}
						onClick={() => setVariant(v.type)}
					>
						{v.label}
					</button>
				))}
			</div>
			<div className="relative h-[500px] cursor-crosshair overflow-hidden rounded-lg border">
				<ImageTrailCursor images={images} variant={variant} />
				<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
					<p className="text-lg font-medium select-none">Move your cursor here</p>
				</div>
			</div>
		</div>
	);
}
