import Anthropic from '@anthropic-ai/sdk'
import { anthropic }  from '@/lib/anthropic'
import { uploadToS3 } from '@/lib/s3'
import type { ParsedGeometry, NormalizedGeometry } from '@/types'

export async function reasonLayout(
  jobId: string,
  parsedData: ParsedGeometry
): Promise<NormalizedGeometry> {

  const REASON_SYSTEM_PROMPT = `You are an expert 3D architectural and mechanical modeller.
Given raw geometry data extracted from a 2D engineering drawing, you produce clean, normalized
geometry that is ready for 3D extrusion and rendering.

You must return ONLY valid JSON. No explanations, no markdown, no preamble.`

  const REASON_USER_PROMPT = `Given this raw geometry extracted from a 2D engineering drawing,
produce a clean normalized representation for 3D generation.

Input data:
${JSON.stringify(parsedData, null, 2)}

Return this exact JSON structure:
{
  "walls": [
    {
      "id": "w1",
      "start": [x1, y1],
      "end": [x2, y2],
      "thickness": 200,
      "height": 2800,
      "material": "concrete" | "brick" | "drywall" | "glass" | "unknown",
      "isExternal": true | false,
      "isStructural": true | false
    }
  ],
  "openings": [
    {
      "id": "o1",
      "type": "door" | "window",
      "wallId": "w1",
      "positionAlongWall": 0.5,
      "width": 900,
      "height": 2100,
      "sillHeight": 0
    }
  ],
  "rooms": [
    {
      "id": "r1",
      "name": "Living Room",
      "boundary": [[x1,y1],[x2,y2],[x3,y3],[x4,y4]],
      "area": 25.5,
      "ceilingHeight": 2800
    }
  ],
  "structuralElements": [
    {
      "id": "col1",
      "type": "column" | "beam" | "slab",
      "geometry": { "x": 0, "y": 0, "width": 400, "depth": 400, "height": 3000 }
    }
  ],
  "floors": [
    {
      "id": "f1",
      "level": 0,
      "height": 0,
      "rooms": ["r1", "r2"]
    }
  ],
  "defaultHeight": 2800,
  "units": "mm",
  "bounds": {
    "minX": 0, "maxX": 10000,
    "minY": 0, "maxY": 8000
  },
  "confidence": 0.85,
  "notes": "External walls assumed 250mm, internal 150mm. Heights inferred from standard residential dimensions."
}

Rules:
- Merge colinear wall segments that share endpoints (within 5 units tolerance)
- Identify external walls (those forming the building perimeter)
- Default wall height: 2800mm for residential, 3500mm for commercial, 4000mm for industrial
- Standard door: 900mm wide × 2100mm high
- Standard window: 1200mm wide × 1200mm high, sill at 900mm
- Normalize all coordinates to start at [0,0]
- If drawing type is mechanical: treat closed shapes as parts/components instead of rooms`

  const message = await anthropic.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 8192,
    system:     REASON_SYSTEM_PROMPT,
    messages: [{
      role:    'user',
      content: REASON_USER_PROMPT,
    }],
  })

  const responseText = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')

  try {
    const cleaned  = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const geometry = JSON.parse(cleaned) as NormalizedGeometry

    await uploadToS3(
      `intermediate/${jobId}/geometry.json`,
      Buffer.from(JSON.stringify(geometry, null, 2)),
      'application/json'
    )

    return geometry
  } catch {
    throw new Error('Claude returned invalid JSON in Stage 2')
  }
}
