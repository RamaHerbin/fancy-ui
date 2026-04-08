## Title format

<!--
Use conventional commits: <type>(<scope>): <short description>

Types: feat | fix | refactor | chore | docs | style | perf | test
Scope: component name or area — e.g. feat(border-beam): add colorFrom prop
                                                         fix(marquee): pause on hover not working
-->

## What does this PR do?

<!-- 1–3 bullet points -->

## Type of change

- [ ] New component
- [ ] New prop / feature on existing component
- [ ] Bug fix
- [ ] Refactor / DX
- [ ] Chore / infra

## Checklist

- [ ] Demo page exists at `src/routes/demo/<slug>/+page.svelte`
- [ ] Component exported from `src/lib/fancy-ui/index.ts`
- [ ] All props are typed (no `any`)
- [ ] Svelte 5 runes used (`$state`, `$derived`, `$effect`, `$props`)
- [ ] `pnpm check` passes
- [ ] `pnpm test` passes
- [ ] Changeset added (`pnpm changeset`)

## Breaking changes

<!-- List any breaking changes, or write "None" -->

## Demo

<!-- Link, screenshot, or recording -->
