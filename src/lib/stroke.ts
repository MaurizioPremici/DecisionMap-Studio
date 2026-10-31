import type { StrokeStyle } from '../types'

export function lineStrokeStyle(value:StrokeStyle|undefined,legacyDashed=false):StrokeStyle{
  return value??(legacyDashed?'dashed':'solid')
}

export function strokeDasharray(style:StrokeStyle):string|undefined{
  if(style==='dashed')return '10 7'
  if(style==='dotted')return '1 6'
  return undefined
}
