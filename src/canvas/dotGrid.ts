/** Distance between grid dots at 100% zoom, in pixels. */
const DOT_SPACING = 24

/**
 * The dot grid is a CSS background behind a transparent canvas, so it has to
 * be moved and scaled by hand to follow the canvas as the user pans and zooms.
 */
export function applyDotGrid(wrapper: HTMLElement | null, scrollX: number, scrollY: number, zoom: number) {
  if (!wrapper) return

  // Keep dots readable when zoomed far out by doubling the spacing.
  let spacing = DOT_SPACING * zoom
  while (spacing < DOT_SPACING / 2) spacing *= 2

  wrapper.style.backgroundSize = `${spacing}px ${spacing}px`
  wrapper.style.backgroundPosition = `${scrollX * zoom}px ${scrollY * zoom}px`
}
