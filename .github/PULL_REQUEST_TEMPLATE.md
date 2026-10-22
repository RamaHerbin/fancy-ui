## Title format

<!--
Use conventional commits: <type>(<scope>): <short description>

Types: feat | fix | refactor | chore | docs | style | perf | test
Scope: component name or area, e.g. feat(border-beam): add colorFrom prop
                                    fix(marquee): pause on hover not working
-->

## What does this PR do?

<!-- 1-3 bullet points -->

## Type of change

- [ ] New component
- [ ] New prop / feature on existing component
- [ ] Bug fix
- [ ] Documentation
- [ ] Refactor / DX
- [ ] Chore / infra

## Checklist

- [ ] Tests added or updated, and `pnpm test` passes
- [ ] `pnpm check` passes
- [ ] All three ports updated: Svelte, React (`react/PORTING.md`) and Vue (`vue/PORTING.md`), and `pnpm check:props` passes
- [ ] Docs examples under `src/lib/components/docs/examples/<slug>/` listed in `examples/registry.ts`, and the registry entry describes every prop
- [ ] Changeset added (`pnpm changeset`), or none needed because no published package file changed
- [ ] Every visible string goes through the message catalogs (`pnpm check:i18n`)
- [ ] No third-party product or brand names in code comments, docs, commits or this PR (credits belong in the credits registry only)

## Breaking changes

<!-- List any breaking changes, or write "None" -->
