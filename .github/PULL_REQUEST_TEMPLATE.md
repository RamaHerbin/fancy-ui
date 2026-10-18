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

- [ ] Docs examples under `src/lib/components/docs/examples/<slug>/` and listed in `examples/registry.ts`
- [ ] Component exported from `src/lib/fancy-ui/index.ts`
- [ ] Component `README.md` and registry entry describe every prop
- [ ] React and Vue ports added or updated (`react/PORTING.md`, `vue/PORTING.md`) — `pnpm check:props` passes
- [ ] All props are typed (no `any`)
- [ ] Svelte 5 runes used (`$state`, `$derived`, `$effect`, `$props`)
- [ ] `pnpm check` passes
- [ ] `pnpm test` passes
- [ ] Changeset added (`pnpm changeset`)

## Breaking changes

<!-- List any breaking changes, or write "None" -->

## Demo

<!-- Link, screenshot, or recording -->
