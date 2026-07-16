/*
 * Shared storefront layout tokens for the mobile app column and its edge-to-edge
 * scrollers. Centralized so the lateral gutter (12px) lives in one place and the
 * negative-margin bleeds always cancel it exactly, with no drift between files.
 */

/** Mobile app column (header, search, plain sections): centered, 12px gutter. */
export const COLUMN = "mx-auto w-full max-w-[26rem] px-3";

/** Responsive column: mobile app width, widening to the desktop grid. */
export const CONTAINER = "mx-auto w-full max-w-[26rem] px-3 md:max-w-6xl md:px-8";

/** Negative-margin bleed that cancels the 12px gutter for edge-to-edge scrollers. */
export const BLEED = "-mx-3 px-3 scroll-px-3";
