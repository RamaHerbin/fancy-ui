# Plan : Port du portfolio Vue/Nuxt vers SvelteKit

## Decisions prises

| Question | Decision |
|----------|----------|
| Route | `/portfolio` (homepage existante inchangee) |
| Contact form | Frontend seulement (mailto: ou Formspree, pas de backend) |
| LiquidGlass (NavAnchor) | Remplace par CSS glassmorphism (`backdrop-blur-sm bg-background/80`) |
| AnimatedTooltip ↔ ReviewCard sync | Simplifie (pas de hover sync, composants independants) |
| Font | Bricolage Grotesque via Google Fonts, scope au layout portfolio |

---

## Structure de fichiers

```
src/lib/portfolio/
  types.ts                        # Interfaces TypeScript (ContactFormData, FieldErrors)
  validation.ts                   # Validation formulaire (fonctions pures)
  index.ts                        # Barrel export
  NavAnchor.svelte                # Nav fixe + dark mode toggle (glassmorphism CSS)
  ContactForm.svelte              # Formulaire contact (frontend-only, textarea animee)
  ReviewCard.svelte               # Carte temoignage avec lien LinkedIn
  CarbonNeutralBadge.svelte       # Badge carbone (BlurReveal + lien)
  sections/
    Hero.svelte                   # FluidCursor, InteractiveGridPattern, BlurReveal, RainbowButton
    Trusted.svelte                # AnimatedLogoCloud
    About.svelte                  # HTML/Tailwind pur
    Projects.svelte               # HTML/Tailwind pur + liens
    Testimonials.svelte           # AnimatedTooltip, Marquee, ReviewCard
    Passions.svelte               # HTML/Tailwind pur + images
    Creative.svelte               # ImageTrailCursor (desktop only)
    Contact.svelte                # ContactForm + liens sociaux
    Footer.svelte                 # Copyright + CarbonNeutralBadge

src/routes/portfolio/
  +layout.svelte                  # Font Bricolage Grotesque + NavAnchor
  +page.svelte                    # Compose toutes les sections
  carbon/+page.svelte             # Page carbone (BlurReveal)
  lille/+page.svelte              # Page Lille (FallingStarsBg, Timeline)
  projects/
    fleur-de-papier/+page.svelte  # Projets Fleur de Papier
    personal/+page.svelte         # Projets personnels

static/portfolio/                 # Assets copies depuis vendor/portfolio/public/
  Angular_Logo_SVG.svg
  Ansys_logo_(2019).svg
  FleurdePapier.svg
  logo-gobelins.svg
  nvidia_logo.svg
  Synopsys_Logo.svg
  IMG_0318.jpg
  DSCF0404.jpg
  DSCF0385-ed.jpg
  20160624.jpg
  dsc9566-2.jpg
  profile-rama.jpg
```

---

## Composants Inspira deja portes et reutilises

| Composant | Utilise dans | API |
|-----------|-------------|-----|
| `FluidCursor` | Hero | `simResolution` prop |
| `InteractiveGridPattern` | Hero | CSS mask style |
| `BlurReveal` | Hero, Carbon, CarbonNeutralBadge | `delay`, `duration` props |
| `RainbowButton` | Hero | `size` prop, snippet children |
| `AnimatedLogoCloud` | Trusted | `logos: {name, path}[]` prop |
| `AnimatedTooltip` | Testimonials | `items` prop |
| `Marquee` | Testimonials | `reverse`, `pauseOnHover` props, `[--duration:20s]` |
| `ImageTrailCursor` | Creative | `images`, `variant` props |
| `FallingStarsBg` | Lille | `count`, `color`, `opacity` props |
| `Timeline` | Lille | items + snippets |

## Fichiers existants reutilises (NE PAS modifier)

| Fichier | Utilite |
|---------|---------|
| `src/lib/stores/theme.svelte.ts` | `createThemeState()`, `toggleTheme()` pour NavAnchor |
| `src/lib/fancy-ui/logo-cloud/AnimatedLogoCloud.svelte` | Drop-in pour Trusted |
| `src/lib/utils.ts` | `cn()` pour class merging |

## Composants custom NON necessaires

- **OptimizedImage** → `<img loading="lazy">` natif (support universel)
- **LogoCard** → non utilise dans le template final (AnimatedLogoCloud est utilise a la place)
- **IInput** → le gradient mouse-tracking sera integre directement dans ContactForm

---

## Etapes d'implementation

### Phase 0 : Setup

| # | Tache | Complexite | Fichiers |
|---|-------|-----------|----------|
| 1 | Copier les assets statiques | Simple | `static/portfolio/` (6 SVG + 6 JPG) |
| 2 | Creer le layout portfolio | Simple | `src/routes/portfolio/+layout.svelte` |

**Etape 1 — Assets** : Copier SVGs et JPGs depuis `vendor/portfolio/public/` vers `static/portfolio/`.

**Etape 2 — Layout** : Google Fonts Bricolage Grotesque dans `<svelte:head>`, NavAnchor fixe en haut, `{@render children()}`.

---

### Phase 1 : Composants custom (parallelisables)

| # | Tache | Complexite | Source Vue |
|---|-------|-----------|------------|
| 3 | Types + validation | Simple | `vendor/portfolio/app/composables/useFormValidation.ts` |
| 4 | ReviewCard | Simple | `vendor/portfolio/app/components/ReviewCard.vue` |
| 5 | CarbonNeutralBadge | Simple | `vendor/portfolio/app/components/ui/carbon/CarbonNeutralBadge.vue` |
| 6 | NavAnchor | Moyen | `vendor/portfolio/app/components/NavAnchor.vue` |

**Etape 3 — Types** :
- `types.ts` : `ContactFormData { name, email, message }`, `FieldErrors`
- `validation.ts` : `validateContactForm()`, `sanitizeFormData()`, `hasValidationErrors()`

**Etape 4 — ReviewCard** :
- Props : `img`, `name`, `username`, `body`, `linkedinUrl`, `class`
- Wrappe dans `<a target="_blank" rel="noopener noreferrer">`
- Styling dark/light avec opacites Tailwind

**Etape 5 — CarbonNeutralBadge** :
- Utilise `BlurReveal` de `$lib/fancy-ui` (desktop)
- Rendu simple sans animation (mobile)
- Lien vers `/portfolio/carbon`

**Etape 6 — NavAnchor** :
- Glassmorphism CSS : `backdrop-blur-sm bg-background/80 border border-border/20`
- Dark mode via `createThemeState()` de `$lib/stores/theme.svelte.ts`
- Logo "R" (scroll to top) + titre "Portfolio 2k25" + toggle sun/moon SVG
- Position fixe centree en haut

---

### Phase 2 : Sections homepage (parallelisables)

| # | Tache | Complexite | Composants Inspira |
|---|-------|-----------|-------------------|
| 7 | Hero | Moyen | FluidCursor, InteractiveGridPattern, BlurReveal, RainbowButton |
| 8 | Trusted | Simple | AnimatedLogoCloud |
| 9 | About | Simple | Aucun |
| 10 | Projects | Simple | Aucun |
| 11 | Testimonials | Moyen | AnimatedTooltip, Marquee |
| 12 | Passions | Simple | Aucun |
| 13 | Creative | Moyen | ImageTrailCursor |
| 14 | Contact | Complexe | Aucun (form custom) |
| 15 | Footer | Simple | Aucun (BlurReveal via CarbonNeutralBadge) |

**Etape 7 — Hero** :
- Plein ecran 90vh, contenu centre
- `FluidCursor` avec IntersectionObserver (perf : charge seulement quand visible)
- `InteractiveGridPattern` en fond avec masque radial-gradient
- `BlurReveal` sur le texte (delay 0.2, duration 0.75)
- `RainbowButton` size="lg" avec scroll vers #trusted
- Source : `vendor/portfolio/app/components/sections/Hero.vue`

**Etape 8 — Trusted** :
- `AnimatedLogoCloud` avec `logos` : Angular, Gobelins, Nvidia, Synopsys, Fleur de Papier, Ansys
- Paths mis a jour vers `/portfolio/*.svg`
- Source : `vendor/portfolio/app/components/sections/Trusted.vue`

**Etape 9 — About** :
- 2 colonnes (bio + photo profil)
- Image `/portfolio/IMG_0318.jpg` avec `loading="lazy"`
- Liens vers Ansys/Gobelins en `target="_blank"`
- Source : `vendor/portfolio/app/components/sections/About.vue`

**Etape 10 — Projects** :
- 3 cartes (Current Work NDA, Fleur de Papier, Personal)
- Hover effects sur les bordures
- Liens : `<a href="/portfolio/projects/fleur-de-papier">` etc.
- SVG icons inline
- Source : `vendor/portfolio/app/components/sections/Projects.vue`

**Etape 11 — Testimonials** :
- `AnimatedTooltip` avec 5 temoignages (id, name, designation, image)
- `Marquee` reverse, pauseOnHover, `[--duration:20s]`
- Portfolio `ReviewCard` pour chaque temoignage
- Gradients fade gauche/droite
- Source : `vendor/portfolio/app/components/sections/Testimonials.vue`

**Etape 12 — Passions** :
- 2 colonnes : Photographie (2 images hover scale) + Musique (4 genre tags)
- Section Gear en 3 colonnes (Dev, Photo, Music)
- Source : `vendor/portfolio/app/components/sections/Passions.vue`

**Etape 13 — Creative** :
- `ImageTrailCursor` avec 4 images, `variant="type2"`
- Desktop only : masque sur `window.innerWidth < 768`
- IntersectionObserver pour chargement conditionnel
- Source : `vendor/portfolio/app/components/sections/Creative.vue`

**Etape 14 — Contact** :
- Titre "Let's Connect" + sous-titre
- Formulaire : 3 champs (nom, email, message) avec validation client
- Textarea avec gradient radial mouse-tracking (radial-gradient blue-500, 100px)
- Soumission : `mailto:rama.herbin@gmail.com` (ou Formspree)
- 3 liens sociaux : Email, LinkedIn, GitHub (SVG icons inline)
- "Based in Lyon, France"
- Sources : `vendor/portfolio/app/components/sections/Contact.vue` + `ContactForm.vue`

**Etape 15 — Footer** :
- `<footer>` avec border-top
- Copyright `© {new Date().getFullYear()} Rama Herbin`
- `CarbonNeutralBadge`
- Source : `vendor/portfolio/app/components/sections/Footer.vue`

---

### Phase 3 : Pages routes

| # | Tache | Complexite | Composants Inspira |
|---|-------|-----------|-------------------|
| 16 | Page principale `/portfolio` | Simple | Toutes les sections |
| 17 | Page carbone `/portfolio/carbon` | Simple | BlurReveal |
| 18 | Page Lille `/portfolio/lille` | Moyen | FallingStarsBg, Timeline |
| 19 | Page Fleur de Papier | Simple | Aucun |
| 20 | Page Personal Projects | Simple | Aucun |

**Etape 16 — Page principale** :
- Compose les 9 sections dans l'ordre : Hero → Trusted → About → Projects → Testimonials → Passions → Creative → Contact → Footer
- `<svelte:head>` avec title + meta OG/Twitter

**Etape 17 — Carbon** :
- `BlurReveal` pour chaque section de contenu
- 5 strategies d'optimisation + 4 metriques (Bundle ~45KB, FCP < 1.2s, Lighthouse 95+, CO2 ~0.2g)
- Fond noir force (`bg-black text-white`)
- Source : `vendor/portfolio/app/pages/carbon.vue`

**Etape 18 — Lille** :
- `FallingStarsBg` (count=150, color=#8B5CF6, opacity=0.2)
- `Timeline` avec 4 creneaux (9h, 14h, 19h, 23h) + contenu custom par creneau
- 5 cartes raisons en grille 2 colonnes + 1 pleine largeur
- Source : `vendor/portfolio/app/pages/lille.vue`

**Etape 19 — Fleur de Papier** :
- NavAnchor + Footer reutilises
- Tech tags, description, 2 projets placeholder
- Source : `vendor/portfolio/app/pages/projects/fleur-de-papier.vue`

**Etape 20 — Personal** :
- 4 cartes projets (Portfolio 2025, Blog, Archive, Creative Experiments)
- Liens GitHub/blog
- Source : `vendor/portfolio/app/pages/projects/personal.vue`

---

### Phase 4 : Finalisation

| # | Tache | Complexite |
|---|-------|-----------|
| 21 | Barrel export + verification | Simple |

**Etape 21** :
- `src/lib/portfolio/index.ts` avec tous les exports
- NE PAS ajouter au registre `src/lib/fancy-ui/registry.ts` (composants specifiques au portfolio)
- Verification : `pnpm check`, `pnpm dev`

---

## Ordre de parallelisation

```
Phase 0 : [1] → [2]

Phase 1 : [3] | [4] | [5] | [6]  (tous en parallele)

Phase 2 : [7] | [8] | [9] | [10] | [11] | [12] | [13] | [15]  (en parallele)
          [14] depend de [3] (types/validation)

Phase 3 : [16] depend de toutes les sections
          [17] | [18] | [19] | [20]  (en parallele, dependent de [6] NavAnchor)

Phase 4 : [21] depend de tout
```

---

## Verification finale

1. `pnpm check` — pas de nouvelles erreurs TypeScript
2. `pnpm dev` → naviguer sur `/portfolio` et verifier chaque section visuellement
3. Verifier tous les liens internes (`/portfolio/carbon`, `/portfolio/lille`, `/portfolio/projects/*`)
4. Tester dark/light mode toggle dans NavAnchor
5. Tester responsive mobile/desktop
6. Verifier que la homepage existante (`/`) n'est pas impactee
7. Verifier les images (lazy loading, bons chemins `/portfolio/*`)
