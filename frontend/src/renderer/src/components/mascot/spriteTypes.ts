/** A single animation frame from the sprite sheet. */
export interface SpriteFrame {
  /** Human-readable frame name, e.g. "Sleep A". */
  name: string
  /** Animation group tag, e.g. "sleep", "flap", "talk". */
  tag: string
  /**
   * Pixel rows — each string is `size` hex characters long.
   * Each character is a hex index (0-e) into the palette.
   * Index 0 is always transparent.
   */
  px: string[]
}

/** The top-level sprite data structure loaded from JSON. */
export interface SpriteData {
  /** Native pixel dimension (width and height are equal). */
  size: number
  /** Ordered hex colour strings, index 0 is transparent. */
  palette: string[]
  /** All animation frames. */
  frames: SpriteFrame[]
}

/**
 * Map of animation tag → ordered list of frame names that
 * belong to that animation.
 */
export type AnimationMap = Record<string, string[]>
