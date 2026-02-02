import { render, screen, cleanup } from '@testing-library/svelte';
import { afterEach, describe, it, expect } from 'vitest';
import Page from './+page.svelte';

describe('+page.svelte', () => {
	afterEach(cleanup);
	it('renders the heading', () => {
		render(Page);
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('FancyUI');
	});

	it('renders the description text', () => {
		render(Page);
		expect(
			screen.getByText('Beautiful UI components implemented from FancyUI to Svelte 5.')
		).toBeInTheDocument();
	});

	it('renders a link to the demo page', () => {
		render(Page);
		const link = screen.getByRole('link', { name: /browse components/i });
		expect(link).toBeInTheDocument();
		expect(link).toHaveAttribute('href', '/demo');
	});
});
