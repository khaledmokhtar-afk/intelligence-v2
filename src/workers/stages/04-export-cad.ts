import DxfWriter from 'dxf-writer'
import { uploadToS3 } from '@/lib/s3'
import type { NormalizedGeometry } from '@/types'

export async function exportCAD(
  jobId: string,
  geo: NormalizedGeometry,
  gltfKey: string
): Promise<Record<string, string>> {
  console.log('[Stage4] Exporting CAD files...')
  const outputs: Record<string, string> = { gltf: gltfKey }

  // ── DXF ──────────────────────────────────────────────────────────────────────
  const dxf = new DxfWriter()

  const layers: [string, number][] = [
    ['A-WALL-FULL',   7], ['A-WALL-PART',   8], ['A-WALL-DEMO',   9],
    ['A-GLAZ',      131], ['A-DOOR',         7], ['A-FURN',        52],
    ['A-FURN-SYST',  51], ['A-EQPM',        41], ['A-COLS',         7],
    ['A-GRID',      253], ['A-ANNO-TEXT',    7], ['A-ANNO-DIMS',    2],
    ['A-ROOM-TAG',    3], ['A-FLOR-HATCH', 253], ['A-ANNO-SYMB',    7],
    ['DEFPOINTS',     2],
  ]
  for (const [name, color] of layers) dxf.addLayer(name, color, 'CONTINUOUS')

  // Walls
  for (const wall of geo.walls ?? []) {
    dxf.setActiveLayer(wall.isStructural ? 'A-COLS' : wall.isFitout ? 'A-WALL-PART' : 'A-WALL-FULL')
    const [x1, y1] = wall.start
    const [x2, y2] = wall.end
    const t    = (wall.thickness ?? 150) / 2
    const angle = Math.atan2(y2 - y1, x2 - x1)
    const px = Math.sin(angle) * t, py = -Math.cos(angle) * t
    dxf.drawLine(x1 + px, y1 + py, x2 + px, y2 + py)
    dxf.drawLine(x2 + px, y2 + py, x2 - px, y2 - py)
    dxf.drawLine(x2 - px, y2 - py, x1 - px, y1 - py)
    dxf.drawLine(x1 - px, y1 - py, x1 + px, y1 + py)
  }

  // Glazing
  dxf.setActiveLayer('A-GLAZ')
  for (const gl of geo.glazing ?? []) {
    dxf.drawLine(gl.start[0], gl.start[1], gl.end[0], gl.end[1])
  }

  // Columns
  dxf.setActiveLayer('A-COLS')
  for (const col of geo.columns ?? []) {
    const hw = (col.width ?? 400) / 2, hd = (col.depth ?? 400) / 2
    const x = col.position[0], y = col.position[1]
    dxf.drawLine(x - hw, y - hd, x + hw, y - hd)
    dxf.drawLine(x + hw, y - hd, x + hw, y + hd)
    dxf.drawLine(x + hw, y + hd, x - hw, y + hd)
    dxf.drawLine(x - hw, y + hd, x - hw, y - hd)
    dxf.drawLine(x - hw, y - hd, x + hw, y + hd)
    dxf.drawLine(x + hw, y - hd, x - hw, y + hd)
  }

  // Grid
  dxf.setActiveLayer('A-GRID')
  const bounds = geo.bounds ?? { minX: 0, minY: 0, maxX: 60000, maxY: 34500, width: 60000, depth: 34500 }
  for (const hl of geo.structuralGrid?.horizontalLines ?? []) {
    dxf.drawLine(hl.x, bounds.minY - 2000, hl.x, bounds.maxY + 2000)
    dxf.drawCircle(hl.x, bounds.maxY + 2500, 600)
    dxf.drawText(hl.x, bounds.maxY + 2500, 400, 0, hl.id)
  }
  for (const vl of geo.structuralGrid?.verticalLines ?? []) {
    dxf.drawLine(bounds.minX - 2000, vl.y, bounds.maxX + 2000, vl.y)
    dxf.drawCircle(bounds.minX - 2500, vl.y, 600)
    dxf.drawText(bounds.minX - 2500, vl.y, 400, 0, vl.id)
  }

  // Furniture
  dxf.setActiveLayer('A-FURN')
  for (const f of geo.furniture ?? []) {
    if (!f.width || !f.depth) continue
    dxf.drawRect(f.position[0], f.position[1], f.position[0] + f.width, f.position[1] + f.depth)
  }

  // Pods
  dxf.setActiveLayer('A-FURN-SYST')
  for (const pod of geo.pods ?? []) {
    dxf.drawRect(pod.position[0], pod.position[1], pod.position[0] + pod.width, pod.position[1] + pod.depth)
    dxf.drawText(pod.position[0] + pod.width / 2, pod.position[1] + pod.depth / 2, 150, 0,
      pod.type.replace('_', ' ').toUpperCase())
  }

  // Room tags
  dxf.setActiveLayer('A-ROOM-TAG')
  for (const room of geo.rooms ?? []) {
    if (!room.centroid) continue
    const [cx, cy] = room.centroid
    dxf.drawText(cx, cy + 150, 200, 0, room.name)
    dxf.drawText(cx, cy - 150, 175, 0, room.id ?? room.number ?? '')
  }

  const dxfKey = `outputs/${jobId}/drawing.dxf`
  await uploadToS3(dxfKey, Buffer.from(dxf.toDxfString(), 'utf-8'), 'application/dxf')
  outputs.dxf = dxfKey
  console.log(`[Stage4] DXF written: ${dxfKey}`)

  // ── OBJ ──────────────────────────────────────────────────────────────────────
  const objLines = [
    '# FormForge OBJ Export',
    `# Job: ${jobId}`,
    `# Generated: ${new Date().toISOString()}`,
    '',
  ]
  let vi = 1
  const faces: string[] = []
  const defH = geo.defaults?.ceilingHeight ?? 3000

  const addBox = (label: string, x: number, y: number, z: number, w: number, h: number, d: number, ry = 0) => {
    const cos = Math.cos(ry), sin = Math.sin(ry)
    const hw = w / 2, hd_ = d / 2
    const corners: [number, number, number][] = [
      [-hw, 0, -hd_], [hw, 0, -hd_], [hw, 0, hd_], [-hw, 0, hd_],
      [-hw, h, -hd_], [hw, h, -hd_], [hw, h, hd_], [-hw, h, hd_],
    ]
    for (const [cx, cy, cz] of corners) {
      objLines.push(`v ${((cx * cos - cz * sin + x) / 1000).toFixed(4)} ${((cy + y) / 1000).toFixed(4)} ${((cx * sin + cz * cos + z) / 1000).toFixed(4)}`)
    }
    const b = vi
    faces.push(`g ${label}`,
      `f ${b} ${b+1} ${b+2} ${b+3}`, `f ${b+4} ${b+5} ${b+6} ${b+7}`,
      `f ${b} ${b+4} ${b+5} ${b+1}`, `f ${b+1} ${b+5} ${b+6} ${b+2}`,
      `f ${b+2} ${b+6} ${b+7} ${b+3}`, `f ${b+3} ${b+7} ${b+4} ${b}`)
    vi += 8
  }

  for (const wall of geo.walls ?? []) {
    const [x1, y1] = wall.start, [x2, y2] = wall.end
    const len   = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
    const angle = Math.atan2(y2 - y1, x2 - x1)
    addBox(`wall_${wall.id}`, (x1 + x2) / 2, 0, (y1 + y2) / 2, len, wall.height ?? defH, wall.thickness ?? 150, -angle)
  }
  for (const col of geo.columns ?? []) {
    addBox(`col_${col.id}`, col.position[0], 0, col.position[1], col.width ?? 400, col.height ?? defH, col.depth ?? 400)
  }
  for (const f of geo.furniture ?? []) {
    if (!f.width || !f.depth || !f.height) continue
    addBox(`furn_${f.id}`, f.position[0] + f.width / 2, 0, f.position[1] + f.depth / 2, f.width, f.height, f.depth, ((f.rotation ?? 0) * Math.PI) / 180)
  }

  objLines.push('', ...faces)
  const objKey = `outputs/${jobId}/model.obj`
  await uploadToS3(objKey, Buffer.from(objLines.join('\n'), 'utf-8'), 'model/obj')
  outputs.obj = objKey
  console.log(`[Stage4] OBJ written: ${objKey}`)

  return outputs
}
