/*
 * Test-only rig proving NumberInput consumes the shared field context rather
 * than throwing or ignoring it. Publishes a hand-built FieldContext through
 * FieldProvider instead of rendering a real FormField — this wave's
 * components are built against the frozen FieldContext surface, not against
 * each other, so a fake provider here is the one way to test the consumer
 * side in isolation. Not exported from index.ts, and not collected by Vitest
 * (the run includes `*.test.tsx` only).
 */
import { FieldProvider } from "../../internals/field.js";
import type { FieldContext } from "../../internals/field.js";
import { NumberInput } from "./NumberInput.js";

export interface NumberInputFieldHarnessProps {
	context: FieldContext;
}

export function NumberInputFieldHarness({ context }: NumberInputFieldHarnessProps) {
	// Deliberately passed own props that disagree with the context, so a test
	// can prove the context wins rather than merely matching by coincidence.
	return (
		<FieldProvider value={context}>
			<NumberInput id="own-id" invalid={false} required={false} disabled={false} />
		</FieldProvider>
	);
}
