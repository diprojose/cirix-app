/*
 * Shared storefront layout tokens. One rule for the whole app so the column
 * never drifts between routes: before this, the home used a 12px gutter and
 * every other page hardcoded 20px, so the layout visibly shifted sideways when
 * you tapped into the cart. Import these instead of writing `max-w-[26rem]`.
 */

/** Mobile app column (header, search, plain sections): centered, 16px gutter. */
export const COLUMN = "mx-auto w-full max-w-[26rem] px-4";

/** Catalog and grids: mobile app width, widening to the desktop grid. */
export const CONTAINER = "mx-auto w-full max-w-[26rem] px-4 md:max-w-6xl md:px-8";

/** Forms and reading surfaces: stays narrow on desktop so lines stay scannable. */
export const CONTAINER_READ = "mx-auto w-full max-w-[26rem] px-4 md:max-w-2xl md:px-8";

/** Negative-margin bleed that cancels the gutter for edge-to-edge scrollers. */
export const BLEED = "-mx-4 px-4 scroll-px-4";
