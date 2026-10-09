/**
 * PixelMascot — renders the BARDHIE cockatoo sprite on a
 * canvas element with crisp nearest-neighbour scaling.
 */

import { useEffect, useRef, useMemo, useCallback } from 'react'
import spriteData from '../../../../assets/bardhie-sprite.json'
import { prerenderAllFrames, drawFrame } from './spriteRenderer'
import { createAnimationController } from './animationController'
import type { MascotState } from '../../types/assistant'
import type { SpriteData } from './spriteTypes'
import './PixelMascot.css'

interface PixelMascotProps {
  /** Current animation state. */
  state: MascotState
  /** CSS display size in pixels (default 96). */
  size?: number
  /** Fired when the mascot is clicked. */
  onClick?: () => void
  /** Fired on mouse down for drag tracking. */
  onMouseDown?: (e: React.MouseEvent) => void
  /** Enable native window drag region. */
  isDragRegion?: boolean
  /** Extra class names. */
  className?: string
}

export default function PixelMascot({
  state,
  size = 96,
  onClick,
  onMouseDown,
  isDragRegion = false,
  className = '',
}: PixelMascotProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  // Pre-render all frames once
  const renderedFrames = useMemo(
    () => prerenderAllFrames(spriteData as SpriteData),
    []
  )

  // Create a stable animation controller
  const controller = useMemo(
    () => createAnimationController(renderedFrames),
    [renderedFrames]
  )

  // Update controller state when the prop changes
  useEffect(() => {
    controller.setState(state)
  }, [state, controller])

  // Animation loop
  const animate = useCallback(
    (now: number) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const tick = controller.tick(now)
      drawFrame(ctx, tick.frame, canvas.width, canvas.height)

      rafRef.current = requestAnimationFrame(animate)
    },
    [controller]
  )

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [animate])

  // Check for reduced-motion preference
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  return (
    <div
      className={`mascot-wrapper ${className}`}
      onClick={onClick}
      onMouseDown={onMouseDown}
      style={
        {
          WebkitAppRegion: isDragRegion ? 'drag' : 'no-drag',
          cursor: onClick || onMouseDown ? 'pointer' : 'default',
        } as React.CSSProperties
      }
      role="button"
      tabIndex={0}
      aria-label={`BARDHIE mascot — ${state}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick?.()
      }}
    >
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="mascot-canvas"
        style={{
          width: size,
          height: size,
          imageRendering: 'pixelated',
        }}
      />
    </div>
  )
}
