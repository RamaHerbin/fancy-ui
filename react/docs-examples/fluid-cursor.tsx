import { FluidCursor } from "fancy-ui-react";

export function FluidCursorExample() {
	return (
		<div className="relative h-64 w-full overflow-hidden rounded-lg border">
			<FluidCursor />
			<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
				<p className="text-sm select-none">Move your cursor here</p>
			</div>
		</div>
	);
}
