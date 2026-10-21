---
"fancy-ui-react": patch
---

Button: the attributes it manages (`label` over `aria-label`, `aria-busy` while loading, the inert-link `tabIndex` / `aria-disabled` / `data-disabled`) now win over the same attribute passed directly; previously a consumer value could override them.
