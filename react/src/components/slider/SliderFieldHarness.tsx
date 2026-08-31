/*
 * Test-only rig proving Slider consumes the shared field context rather than
 * throwing or ignoring it. Publishes a hand-built FieldContext through
 * FieldProvider instead of rendering a real FormField — this wave's
 * components are built against the frozen FieldContext surface, not against
 * each other, so a fake provider here is the one way to test the consumer
 * side in isolation. Not exported from index.ts, and not collected by Vitest
 * as a spec file.
 */
import { FieldProvider } from "../../internals/field.js";
import type { FieldContext } from "../../internals/field.js";
import { Slider } from "./Slider.js";

export interface SliderFieldHarnessProps {
	context: FieldContext;
}

export function SliderFieldHarness({ context }: SliderFieldHarnessProps) {
	// Deliberately passed an own id that disagrees with the context, so a
	// test can prove the context wins rather than merely matching by
	// coincidence.
	return (
		<FieldProvider value={context}>
			<Slider id="own-id" disabled={false} />
		</FieldProvider>
	);
}
