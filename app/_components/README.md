# UI: Polaris web components

The interface is built from Shopify's
[Polaris web components](https://shopify.dev/docs/api/app-home/web-components) —
custom elements prefixed `s-`, loaded from Shopify's CDN in `app/layout.tsx`:

```tsx
<Script src="https://cdn.shopify.com/shopifycloud/polaris.js" strategy="beforeInteractive" />
```

`beforeInteractive` gets the elements defined before hydration so there is no flash
of un-upgraded markup. Types come from `@shopify/polaris-types`, pulled in globally
by the triple-slash reference in `polaris-types.d.ts` (rather than
`compilerOptions.types`, which would stop Next's own ambient types resolving).

## What was verified, not assumed

The docs don't state whether these components need App Bridge or only work inside
the embedded Shopify admin. Checked directly against a running page:

- **They work standalone.** All elements register and style themselves with no
  App Bridge and no `shopify-api-key` meta tag.
- **The inputs are form-associated.** `s-text-field`, `s-text-area`, `s-select`,
  `s-checkbox` and `s-date-field` all appear in `new FormData(form)`, so the
  existing Server Actions keep working unchanged.
- **`s-button type="submit"` submits its enclosing form**, so `useActionState`
  and `useFormStatus` behave normally.

## Two gotchas worth knowing

**Setting a select's initial value.** Only `selected` on the option works:

```tsx
<s-select name="priority">
  <s-option value="high" selected>high</s-option>   {/* ✅ */}
</s-select>

<s-select name="priority" value="high">…</s-select>  {/* ❌ ignored */}
<s-select name="p"><option value="high">…</option></s-select>  {/* ❌ native option submits nothing */}
```

**Custom-element events need `addEventListener`.** React's synthetic `onChange`
does not bind reliably to non-standard elements, so `AutoSubmitSelect` in
`ui.tsx` wires the `change` event through a ref.

## Theming

`app/globals.css` no longer sets a `body` background or colour. The scaffold's
dark-mode values painted a near-black page behind Polaris's light components,
leaving anything outside a card unreadable. Polaris owns the surface, typography
and colour scheme; Tailwind's preflight is kept only as a reset and cannot reach
inside the components' shadow roots.

`next/font/google` was also dropped, since Polaris supplies the typeface — which
removes a build-time fetch to Google Fonts.

## Component map

| Purpose | Component |
| --- | --- |
| Page shell and heading | `s-page`, `s-section` |
| Layout | `s-stack`, `s-grid`, `s-box` |
| Lists | `s-table` + `s-table-row` / `s-table-cell` |
| Forms | `s-text-field`, `s-text-area`, `s-select`, `s-date-field`, `s-checkbox`, `s-search-field`, `s-password-field` |
| Actions | `s-button`, `s-link` |
| Status | `s-badge` (priority and task status tones), `s-banner` (form errors) |

Field-level errors from the API go straight into each control's `error` prop;
whole-form errors render as an `s-banner` via `FormError`.
