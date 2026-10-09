/**
 * Renders pixel-art sprite frames to offscreen canvases and
 * provides a fast draw path for the display canvas.
 */

import type { SpriteData, SpriteFrame } from './spriteTypes'

/**
 * Parse a hex colour string (#RRGGBB or #RRGGBBAA) into an
 * [r, g, b, a] tuple where each value is 0-255.
 */
function parseHexColor(hex: string): [number, number, number, number] {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  const a = h.length >= 8 ? parseInt(h.substring(6, 8), 16) : 255
  return [r, g, b, a]
}

/**
 * Pre-parse the palette into RGBA tuples for fast pixel writes.
 */
function parsePalette(palette: string[]): Array<[number, number, number, number]> {
  return palette.map(parseHexColor)
}

/**
 * Render a single sprite frame onto an offscreen canvas at
 * native resolution (size × size).
 */
function renderFrameToCanvas(
  frame: SpriteFrame,
  palette: Array<[number, number, number, number]>,
  size: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const imageData = ctx.createImageData(size, size)
  const data = imageData.data

  for (let y = 0; y < frame.px.length && y < size; y++) {
    const row = frame.px[y]
    for (let x = 0; x < row.length && x < size; x++) {
      const paletteIndex = parseInt(row[x], 16)
      if (paletteIndex === 0) continue // transparent

      const [r, g, b, a] = palette[paletteIndex]
      const offset = (y * size + x) * 4
      data[offset] = r
      data[offset + 1] = g
      data[offset + 2] = b
      data[offset + 3] = a
    }
  }

  ctx.putImageData(imageData, 0, 0)
  return canvas
}

/** A pre-rendered frame with its metadata. */
export interface RenderedFrame {
  name: string
  tag: string
  canvas: HTMLCanvasElement
}

/**
 * Pre-render every frame in the sprite sheet into offscreen
 * canvases. Call this once on load; then use `drawFrame` to
 * blit a frame to the visible display canvas.
 */
export function prerenderAllFrames(sprite: SpriteData): RenderedFrame[] {
  const palette = parsePalette(sprite.palette)
  return sprite.frames.map((frame) => ({
    name: frame.name,
    tag: frame.tag,
    canvas: renderFrameToCanvas(frame, palette, sprite.size),
  }))
}

/**
 * Draw a pre-rendered frame onto a visible canvas, scaled to
 * the canvas's CSS dimensions with nearest-neighbour filtering.
 */
export function drawFrame(
  displayCtx: CanvasRenderingContext2D,
  frame: RenderedFrame,
  displayWidth: number,
  displayHeight: number
): void {
  displayCtx.clearRect(0, 0, displayWidth, displayHeight)

  // Nearest-neighbour scaling for crisp pixel art
  displayCtx.imageSmoothingEnabled = false

  displayCtx.drawImage(frame.canvas, 0, 0, displayWidth, displayHeight)
}
