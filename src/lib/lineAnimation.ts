import type { CSSProperties } from 'react'
import { DEFAULT_LINK_ANIMATION, DEFAULT_PARENT_ANIMATION, type LineAnimation } from '../types'

export function resolveLineAnimation(value:LineAnimation|undefined, parent:boolean):LineAnimation {
  return {...(parent?DEFAULT_PARENT_ANIMATION:DEFAULT_LINK_ANIMATION),...value}
}

export function lineAnimationStyle(value:LineAnimation):CSSProperties {
  const speed=Math.max(.05,Math.min(4,value.speed))
  const duration=Math.max(.2,Math.min(20,value.duration))
  const count=Math.max(1,Math.round(speed*2))
  return {
    '--line-animation-color':value.color,
    '--line-animation-duration':`${duration}s`,
    '--line-animation-cycle':`${duration/count}s`,
    '--line-animation-count':count,
    '--line-animation-travel':-Math.round(100*duration*speed)
  } as CSSProperties
}
