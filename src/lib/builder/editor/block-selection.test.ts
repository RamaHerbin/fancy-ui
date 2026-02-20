/**
 * Block selection tests — verifies that clicking a child block
 * inside a container selects the child, not the parent.
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import { flushSync } from 'svelte';
import type { PageDocument } from '../types/index.js';
import BlockSelectionTestHarness from './BlockSelectionTestHarness.svelte';

function makePage(): PageDocument {
	return {
		version: 1,
		meta: {
			title: 'Test',
			slug: 'test',
			status: 'draft',
			createdAt: '2024-01-01',
			updatedAt: '2024-01-01'
		},
		body: [
			{
				id: 'section-1',
				type: '_section',
				props: {},
				children: [
					{ id: 'text-1', type: '_text', props: { content: 'Hello World', tag: 'p' } },
					{ id: 'text-2', type: '_text', props: { content: 'Second paragraph', tag: 'p' } }
				]
			}
		]
	};
}

function click(el: HTMLElement) {
	el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
	flushSync();
}

describe('block selection with nested blocks', () => {
	it('renders nested BlockWrappers with pointer-events-auto override', () => {
		const { container } = render(BlockSelectionTestHarness, { props: { page: makePage() } });

		// The section's pointer-events-none div should contain child BlockWrappers
		const pointerNoneDivs = container.querySelectorAll('.pointer-events-none');
		const sectionPointerNone = Array.from(pointerNoneDivs).find((el) =>
			el.querySelector('[data-drop-id="text-1"]')
		);
		expect(sectionPointerNone).toBeDefined();

		// Must have the auto override class for nested BlockWrappers
		expect(
			sectionPointerNone!.classList.contains('[&_[data-drop-id]]:pointer-events-auto')
		).toBe(true);
	});

	it('clicking child block selects child, not parent', () => {
		const { container } = render(BlockSelectionTestHarness, { props: { page: makePage() } });

		const childWrapper = container.querySelector('[data-drop-id="text-1"]') as HTMLElement;
		const parentWrapper = container.querySelector('[data-drop-id="section-1"]') as HTMLElement;

		click(childWrapper);

		// Child should be selected (ring-2 ring-primary)
		expect(childWrapper.className).toContain('ring-2');
		expect(childWrapper.className).toContain('ring-primary');

		// Parent should NOT have the selected ring
		const parentHasSelectedRing =
			parentWrapper.className.includes('ring-2') &&
			parentWrapper.className.includes('ring-primary');
		expect(parentHasSelectedRing).toBe(false);
	});

	it('clicking a different child switches selection', () => {
		const { container } = render(BlockSelectionTestHarness, { props: { page: makePage() } });

		const text1 = container.querySelector('[data-drop-id="text-1"]') as HTMLElement;
		const text2 = container.querySelector('[data-drop-id="text-2"]') as HTMLElement;

		click(text1);
		expect(text1.className).toContain('ring-2');

		click(text2);
		expect(text2.className).toContain('ring-2');
		expect(text1.className).not.toContain('ring-2');
	});

	it('clicking parent selects parent', () => {
		const { container } = render(BlockSelectionTestHarness, { props: { page: makePage() } });

		const parentWrapper = container.querySelector('[data-drop-id="section-1"]') as HTMLElement;

		click(parentWrapper);
		expect(parentWrapper.className).toContain('ring-2');
		expect(parentWrapper.className).toContain('ring-primary');
	});
});
