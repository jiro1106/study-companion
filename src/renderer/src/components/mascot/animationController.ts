/**
 * Animation controller — maps MascotState to the correct sprite
 * frames and manages time-based frame cycling.
 */

import type { MascotState } from '../../types/assistant'
import type { RenderedFrame } from './spriteRenderer'

/** Animation definition for a given mascot state. */
interface AnimationDef {
  /** Sprite tag(s) to pull frames from, in display order. */
  tags: string[]
  /** Milliseconds between frame advances. */
  interval: number
  /** If true, play the sequence once then hold the last frame. */
  once?: boolean
}

/** Configuration for every mascot state. */
const ANIMATION_DEFS: Record<MascotState, AnimationDef> = {
  sleeping: { tags: ['sleep'], interval: 1050 },
  awake:    { tags: ['awake'], interval: 0, once: true },
  listening:{ tags: ['listen'], interval: 0, once: true },
  thinking: { tags: ['flap'], interval: 260 },
  speaking: { tags: ['talk'], interval: 190 },
}

/**
 * Resolve which pre-rendered frames belong to an animation
 * definition, preserving the order defined by the tags array
 * and the original frame order within each tag.
 */
function resolveFrames(
  allFrames: RenderedFrame[],
  def: AnimationDef
): RenderedFrame[] {
  const result: RenderedFrame[] = []
  for (const tag of def.tags) {
    for (const frame of allFrames) {
      if (frame.tag === tag) {
        result.push(frame)
      }
    }
  }
  return result
}

/** Snapshot returned by the controller on every tick. */
export interface AnimationTick {
  frame: RenderedFrame
  /** Index within the current animation sequence. */
  index: number
}

/**
 * Create an animation controller for a set of pre-rendered frames.
 *
 * Usage:
 * ```ts
 * const ctrl = createAnimationController(frames)
 * ctrl.setState('sleeping')
 *
 * function loop() {
 *   const tick = ctrl.tick(performance.now())
 *   drawFrame(ctx, tick.frame, w, h)
 *   requestAnimationFrame(loop)
 * }
 * ```
 */
export function createAnimationController(allFrames: RenderedFrame[]) {
  let currentState: MascotState = 'sleeping'
  let activeFrames: RenderedFrame[] = resolveFrames(allFrames, ANIMATION_DEFS.sleeping)
  let currentIndex = 0
  let lastAdvance = 0
  let interval = ANIMATION_DEFS.sleeping.interval
  let playOnce = false

  function setState(state: MascotState): void {
    if (state === currentState) return
    currentState = state

    const def = ANIMATION_DEFS[state]
    activeFrames = resolveFrames(allFrames, def)
    currentIndex = 0
    lastAdvance = 0
    interval = def.interval
    playOnce = def.once ?? false
  }

  function tick(now: number): AnimationTick {
    if (activeFrames.length === 0) {
      // Fallback — should never happen with valid sprite data
      return { frame: allFrames[0], index: 0 }
    }

    // Single-frame or play-once-finished: hold current
    if (activeFrames.length === 1 || interval <= 0) {
      return { frame: activeFrames[currentIndex], index: currentIndex }
    }

    if (lastAdvance === 0) {
      lastAdvance = now
    }

    const elapsed = now - lastAdvance
    if (elapsed >= interval) {
      if (playOnce && currentIndex >= activeFrames.length - 1) {
        // Hold last frame
      } else {
        currentIndex = (currentIndex + 1) % activeFrames.length
        lastAdvance = now
      }
    }

    return { frame: activeFrames[currentIndex], index: currentIndex }
  }

  function getState(): MascotState {
    return currentState
  }

  return { setState, tick, getState }
}

export type AnimationController = ReturnType<typeof createAnimationController>
