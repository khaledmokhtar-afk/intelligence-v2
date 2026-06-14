import DxfWriter from 'dxf-writer'
import { uploadToS3 } from '@/lib/s3'
import type { NormalizedGeometry } from '@/types'

export async function exportCAD(
  jobId: string,
  geometry: NormalizedGeometry,
  gltfKey: string
): Promise<Record<string, string>> {
  const outputs: Record<string, string> = { gltf: gltfKey }

  // --- DXF Export ---
  const dxf = new DxfWriter()

  dxf.addLayer('WALLS',      DxfWriter.ACI.WHITE,  'CONTINUOUS')
  dxf.addLayer('OPENINGS',   DxfWriter.ACI.CYAN,   'CONTINUOUS')
  dxf.addLayer('STRUCTURAL', DxfWriter.ACI.RED,    'CONTINUOUS')
  dxf.addLayer('ROOMS',      DxfWriter.ACI.GREEN,  'DASHED')
  dxf.addLayer('DIMS',       DxfWriter.ACI.YELLOW, 'CONTINUOUS')
  dxf.addLayer('TEXT',       DxfWriter.ACI.WHITE,  'CONTINUOUS')

  dxf.setActiveLayer('WALLS')

  for (const wall of geometry.walls ?? []) {
    const [x1, y1] = wall.start
    const [x2, y2] = wall.end
    dxf.drawLine(x1, y1, x2, y2)

    const angle = Math.atan2(y2 - y1, x2 - x1)
    const perpX = Math.sin(angle) * (wall.thickness ?? 200) / 2
    const perpY = -Math.cos(angle) * (wall.thickness ?? 200) / 2
    dxf.drawLine(x1 + perpX, y1 + perpY, x2 + perpX, y2 + perpY)
    dxf.drawLine(x1 - perpX, y1 - perpY, x2 - perpX, y2 - perpY)
  }

  dxf.setActiveLayer('STRUCTURAL')
  for (const el of geometry.structuralElements ?? []) {
    if (el.type === 'column') {
      const g  = el.geometry as Record<string, number>
      const hw = (g.width ?? 400) / 2
      const hd = (g.depth ?? 400) / 2
      dxf.drawRect(g.x - hw, g.y - hd, g.x + hw, g.y + hd)
    }
  }

  dxf.setActiveLayer('TEXT')
  for (const room of geometry.rooms ?? []) {
    if (room.boundary?.length) {
      const cx = room.boundary.reduce((s, p) => s + p[0], 0) / room.boundary.length
      const cy = room.boundary.reduce((s, p) => s + p[1], 0) / room.boundary.length
      dxf.drawText(cx, cy, 200, 0, room.name)
    }
  }

  const dxfString = dxf.toDxfString()
  const dxfKey    = `outputs/${jobId}/drawing.dxf`
  await uploadToS3(dxfKey, Buffer.from(dxfString, 'utf-8'), 'application/dxf')
  outputs.dxf = dxfKey

  // --- OBJ Export ---
  const objLines: string[] = [
    '# FormForge OBJ Export',
    `# Job: ${jobId}`,
    `# Generated: ${new Date().toISOString()}`,
    '',
  ]

  let vertexIndex = 1
  const faceGroups: string[] = []

  for (const wall of geometry.walls ?? []) {
    const [x1, y1] = wall.start
    const [x2, y2] = wall.end
    const h = wall.height ?? geometry.defaultHeight ?? 2800
    const t = (wall.thickness ?? 200) / 2

    const angle = Math.atan2(y2 - y1, x2 - x1)
    const px    = Math.sin(angle) * t
    const py    = -Math.cos(angle) * t

    const verts: [number, number, number][] = [
      [x1 + px, 0, y1 + py],
      [x2 + px, 0, y2 + py],
      [x2 - px, 0, y2 - py],
      [x1 - px, 0, y1 - py],
      [x1 + px, h, y1 + py],
      [x2 + px, h, y2 + py],
      [x2 - px, h, y2 - py],
      [x1 - px, h, y1 - py],
    ]

    for (const [vx, vy, vz] of verts) {
      objLines.push(`v ${(vx / 1000).toFixed(4)} ${(vy / 1000).toFixed(4)} ${(vz / 1000).toFixed(4)}`)
    }

    const base = vertexIndex
    faceGroups.push(
      `g wall_${wall.id}`,
      `f ${base} ${base+1} ${base+2} ${base+3}`,
      `f ${base+4} ${base+5} ${base+6} ${base+7}`,
      `f ${base} ${base+4} ${base+5} ${base+1}`,
      `f ${base+1} ${base+5} ${base+6} ${base+2}`,
      `f ${base+2} ${base+6} ${base+7} ${base+3}`,
      `f ${base+3} ${base+7} ${base+4} ${base}`,
    )
    vertexIndex += 8
  }

  objLines.push('', ...faceGroups)
  const objKey = `outputs/${jobId}/model.obj`
  await uploadToS3(objKey, Buffer.from(objLines.join('\n'), 'utf-8'), 'model/obj')
  outputs.obj = objKey

  return outputs
}
