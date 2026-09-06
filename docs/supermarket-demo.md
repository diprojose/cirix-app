# Supermarket demo

`/es/loyalty` opens `/es/demo/mercado-fresco/home`. Replace `es` with `en` for English. The public administration panel is at `/es/demo/mercado-fresco/admin`; brand settings are at `/admin/settings` within that demo. The second built-in brand is `cirix-market`.

## Structure

- `modules/loyalty/demo/model.ts`: validated demo state, local catalog seed, checkout quotes, order transitions and reward accounting. Reuses the existing product seed, quantity limit, order transition policy and reward value object.
- `modules/loyalty/demo/store.ts` and `provider.tsx`: one browser store per brand, hydration, persistence, cross-tab synchronization and the live theme. No server actions or remote writes.
- `modules/loyalty/demo/`: storefront, shared shell and cards, checkout, account pages, admin and appearance editor. Scoped CSS lives in `market.module.css`.
- `modules/loyalty/branding/`: the shared `BrandProfile` configuration and semantic CSS variable generator. Old `components/store` exports remain compatibility adapters for operational screens.
- `app/[lang]/demo/[brandSlug]`: thin route entry points. The layout resolves a base brand and mounts one demo provider. Built-in brands load from static seeds without Firebase; existing custom brand slugs can load their base profile from the existing repository.

## Appearance contract

Edit the logo, name, tagline, five palette fields and hero copy in the public appearance editor. Preview changes, then select **Guardar apariencia / Save appearance**. Presets change colors only and preserve the current logo and text. Logos accept PNG, JPG and WebP up to 1 MB and remain local.

| Brand field | Role | Principal semantic variables |
| --- | --- | --- |
| `primaryColor` | Primary controls, links and selection | `--color-accent-fill`, `--color-on-accent`, `--color-accent` |
| `secondaryColor` | Benefit highlights | `--color-benefit`, `--color-on-benefit` |
| `accentColor` | Promotional emphasis | `--color-action-fill`, `--color-on-action`, `--color-action-strong` |
| `backgroundColor` | Page background | `--color-bg` |
| `surfaceColor` | Cards and forms | `--color-surface` |

`themeVariables()` derives foregrounds, hover colors, soft surfaces, focus rings and borders. Components use those roles instead of literal brand colors. Danger, warning and success have independent hues with contrast-adjusted text. Legacy `action-*` utilities follow the active promotional palette, and the global workspace action scale now matches its red action color.

## Demo behavior

The versioned key `mixmag:supermarket-demo:v1:<brandSlug>` contains only this visitor's brand, products, cart, orders, coupons, rules and simulated clock. Data survives reloads and is synchronized between tabs of the same browser. Another browser starts independently. Sharing a URL shares the base brand, not local edits. Installed-app icons and social previews also describe the base brand; local branding applies to the interactive store.

The demo includes eight produce items/family packs with local product images. It supports search, department and offer filters, price sorting, product editing and availability, cart quantity changes, pickup/delivery checkout, one percentage coupon per order and one use per demo customer. Delivery is free and payment is simulated. Monetary values are integer USD cents. Product data retains the original Spanish catalog names; controls support Spanish and English.

Orders freeze product prices and reward rules when placed. Confirmation accrues the existing default 5% of margin; credit is held for seven days, expires after 90 days and can cover up to 50% of another order. The admin can change future rules and advance the demo clock. Credit uses the earliest-expiring balance first, and cancellation reverses earning/redemption. Repeated confirmation does not duplicate rewards. The demo does not send notifications, charge payments or connect visitor referral accounts. The referral screen shares the store and explains that limitation.

**Restablecer demo / Reset demo** restores only this brand's local seed after confirmation. Corrupt or incompatible stored data falls back to the seed. If storage is blocked/full, the current page remains usable with an explicit persistence notice. The existing `/admin` routes and real commerce server actions continue to require their original permissions.

## Validation

Run `npm test`, `npm run lint`, `npx tsc --noEmit`, and `npm run build`. Build uses the existing Google font integration and needs access to Google Fonts.

Manual acceptance: add products → apply `FRESCO10` with a $10 subtotal → checkout with sample details → open the order in demo admin → confirm → advance seven days → redeem the released balance in another checkout. Verify cancellation, reload, reset, appearance changes, and another browser/brand. Check 390px, 768px and desktop layouts, keyboard focus, search with no matches, unavailable products and logo upload.
