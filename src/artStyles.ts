import type { ArtStyle, MapNode } from './types'

export type PatternStyle = 'none'|'crosshatch'|'grid'|'diagonal'

export const ART_STYLE_PRESETS:{id:PatternStyle;name:string}[]=[
  {id:'none',name:'Nessuno'},
  {id:'crosshatch',name:'Tratteggio incrociato'},
  {id:'grid',name:'Quadrettato'},
  {id:'diagonal',name:'Righe diagonali'},
]

export function normalizeArtStyle(style:ArtStyle|undefined):PatternStyle{
  if(style==='hatch-gold'||style==='hatch-green')return 'crosshatch'
  if(style==='chalk-blue')return 'grid'
  if(style==='paper-ink')return 'diagonal'
  return style??'none'
}

export function patternColorFor(style:ArtStyle|undefined,color?:string):string{
  if(color&&/^#[0-9a-f]{6}$/i.test(color))return color.toLowerCase()
  if(style==='hatch-gold')return '#9c702d'
  if(style==='hatch-green')return '#398454'
  if(style==='chalk-blue')return '#a9c4d3'
  if(style==='paper-ink')return '#81684b'
  return '#a47b4c'
}

export function artBackgroundImage(style:ArtStyle|undefined,color?:string):string|undefined{
  const pattern=normalizeArtStyle(style)
  const ink=patternColorFor(style,color)
  if(pattern==='crosshatch')return `repeating-linear-gradient(45deg,transparent 0 8px,${ink}66 8px 10px,transparent 10px 18px),repeating-linear-gradient(-45deg,transparent 0 8px,${ink}66 8px 10px,transparent 10px 18px)`
  if(pattern==='grid')return `repeating-linear-gradient(0deg,transparent 0 15px,${ink}33 15px 16px,transparent 16px 30px),repeating-linear-gradient(90deg,transparent 0 15px,${ink}33 15px 16px,transparent 16px 30px)`
  if(pattern==='diagonal')return `repeating-linear-gradient(135deg,transparent 0 13px,${ink}38 13px 14px,transparent 14px 27px)`
  return undefined
}

export function artPatternId(style:ArtStyle|undefined,color?:string):string|undefined{
  const pattern=normalizeArtStyle(style)
  return pattern==='none'?undefined:`art-${pattern}-${patternColorFor(style,color).slice(1)}`
}

export function artSvgPatterns(nodes:MapNode[]):string{
  const used=new Map<string,{pattern:PatternStyle;color:string}>()
  for(const node of nodes){
    const pattern=normalizeArtStyle(node.style.artStyle)
    if(pattern==='none')continue
    const color=patternColorFor(node.style.artStyle,node.style.patternColor)
    used.set(artPatternId(pattern,color)!,{pattern,color})
  }
  return [...used].map(([id,{pattern,color}])=>{
    const size=pattern==='grid'?30:pattern==='diagonal'?27:18
    const geometry=pattern==='crosshatch'?`M0 0L${size} ${size}M${size} 0L0 ${size}`:pattern==='grid'?`M0 0H${size}M0 15H${size}M0 0V${size}M15 0V${size}`:`M0 ${size}L${size} 0`
    const opacity=pattern==='crosshatch'?'.42':pattern==='grid'?'.2':'.24'
    return `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse"><path d="${geometry}" fill="none" stroke="${color}" stroke-width="${pattern==='crosshatch'?1.5:1}" opacity="${opacity}"/></pattern>`
  }).join('')
}
