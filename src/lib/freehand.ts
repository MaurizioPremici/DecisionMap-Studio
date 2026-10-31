import type { MapStroke } from '../types'

export function freehandPath(points:MapStroke['points']) {
  if (!points.length) return ''
  const fmt=(n:number)=>Math.round(n*10)/10
  if (points.length===1) return `M ${fmt(points[0].x)} ${fmt(points[0].y)} L ${fmt(points[0].x+.01)} ${fmt(points[0].y)}`
  let path=`M ${fmt(points[0].x)} ${fmt(points[0].y)}`
  for(let i=1;i<points.length-1;i++){
    const mid={x:(points[i].x+points[i+1].x)/2,y:(points[i].y+points[i+1].y)/2}
    path+=` Q ${fmt(points[i].x)} ${fmt(points[i].y)} ${fmt(mid.x)} ${fmt(mid.y)}`
  }
  const last=points[points.length-1]
  path+=` L ${fmt(last.x)} ${fmt(last.y)}`
  return path
}
