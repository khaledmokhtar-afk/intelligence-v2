import Anthropic from '@anthropic-ai/sdk'
import { anthropic }  from '@/lib/anthropic'
import { uploadToS3 } from '@/lib/s3'
import type { ParsedGeometry, NormalizedGeometry } from '@/types'

export async function reasonLayout(
  jobId: string,
  parsedData: ParsedGeometry
): Promise<NormalizedGeometry> {

  const REASON_SYSTEM_PROMPT = `You are an expert BIM modeller specialising in professional
interior fit-out drawings for commercial office spaces. You convert raw geometry parsed from
2D architectural plans into clean, normalised 3D-ready geometry following Australian and
international practice standards.

CRITICAL: Return ONLY valid JSON. No markdown, no prose, no code blocks. Raw JSON only.`

  const REASON_USER_PROMPT = `Convert this raw parsed geometry from a professional interior
fit-out drawing into a clean normalised 3D geometry model.

RAW PARSED DATA:
${JSON.stringify(parsedData, null, 2)}

NORMALISATION RULES — apply these precisely:

WALLS:
• Concrete core / base-build walls: thickness 200–350 mm, isStructural=true, isFitout=false
• Fit-out partitions (solid outline): thickness 100–150 mm, isStructural=false, isFitout=true
• Demountable partitions: thickness 75–100 mm, isStructural=false, isFitout=true
• Joinery / millwork walls: thickness 50–100 mm, isStructural=false, isFitout=true
• All wall heights = ceilingHeight (3000 mm) unless overridden
• Merge co-linear wall segments sharing endpoints within 50 mm snap tolerance
• Assign layer: concrete-core → "A-WALL-FULL", fitout-partition → "A-WALL-PART", demountable → "A-WALL-DEMO"

GLAZING:
• Curtain wall / perimeter glazing: thickness 50 mm, height = 3000 mm
• Internal glass partitions: thickness 12–25 mm, height = 3000 mm (full height) or 1500 mm (manifestation)
• Extract from walls with wallType="glazing-frame" and from standalone glazing elements

COLUMNS:
• Derive from structuralGrid intersections: place column at every (horizontal × vertical) grid crossing
• Default column size: 400 × 400 mm, height 3000 mm
• Also include any explicitly parsed columns

PODS (phone booths, SONG booths, focus pods):
• Source: furniture with type containing "booth" / "pod" / "SONG" / "PHONE BOOTH", or rooms with roomType="focus" that are very small (< 6 m²)
• Pod height = 2400 mm (deliberate lower than 3000 mm ceiling — creates light gap above)
• Standard sizes: 1000×1000, 1200×1200, 1000×2000, 1200×2000 mm
• Assign podType: "phone-booth" | "focus-pod" | "song-booth"

FURNITURE HEIGHTS (use these if not parsed):
• Desk / workstation: height = 750 mm
• Chair: height = 900 mm
• Locker (single): height = 1800 mm
• Full-height cabinet: height = 2400 mm
• Credenza / low cabinet: height = 750 mm
• Meeting table: height = 750 mm
• Screen / monitor: height = 1500 mm (floor to top)
• Sofa / lounge: height = 850 mm

CORE AREAS:
• Lift lobbies, stair cores, toilet blocks, services risers = coreArea entities
• Extrude to full ceiling height (3000 mm)
• Derive boundary from room boundary if available, else from wall outlines

STRUCTURAL GRID:
• horizontalLines: columns labelled a1 … a13 with x-coordinates
• verticalLines: rows labelled aA … aG with y-coordinates
• Derive from structuralGrid in parsed data; fill gaps using dimension strings if available

BOUNDS:
• minX / minY = 0 (normalised)
• maxX = totalWidth from parsed data (default 60000 mm)
• maxY = totalDepth from parsed data (default 34500 mm)

CONFIDENCE:
• 0.9+ if grid, rooms, and major walls all clearly identified
• 0.7–0.9 if most elements identified with some inference
• < 0.7 if significant guesswork required

Return this exact JSON structure:
{
  "walls": [
    {
      "id": "w_001",
      "start": [<x mm>, <y mm>],
      "end":   [<x mm>, <y mm>],
      "thickness": <mm>,
      "height": 3000,
      "isStructural": <bool>,
      "isFitout": <bool>,
      "layer": "A-WALL-FULL" | "A-WALL-PART" | "A-WALL-DEMO"
    }
  ],
  "glazing": [
    {
      "id": "gl_001",
      "start": [<x mm>, <y mm>],
      "end":   [<x mm>, <y mm>],
      "thickness": 50,
      "height": 3000,
      "glazingType": "curtain-wall" | "internal-glass" | "shopfront"
    }
  ],
  "doors": [
    {
      "id": "d_001",
      "position": [<x mm>, <y mm>],
      "width": 900,
      "height": 2100,
      "swingAngle": 90,
      "wallId": "w_001"
    }
  ],
  "columns": [
    {
      "id": "col_a1aA",
      "gridRef": "a1/aA",
      "position": [<x mm>, <y mm>],
      "width": 400,
      "depth": 400,
      "height": 3000
    }
  ],
  "rooms": [
    {
      "id": "r_001",
      "name": "RECEPTION",
      "number": "114-001",
      "centroid": [<cx mm>, <cy mm>],
      "boundary": [[<x mm>,<y mm>], [<x mm>,<y mm>], [<x mm>,<y mm>], [<x mm>,<y mm>]],
      "area": <sq m>,
      "roomType": "reception" | "meeting" | "office" | "amenity" | "services" | "circulation" | "open-plan" | "wellness" | "focus" | "breakout"
    }
  ],
  "furniture": [
    {
      "id": "f_001",
      "type": "desk" | "chair" | "table" | "locker" | "cabinet" | "credenza" | "sofa" | "screen" | "other",
      "label": <string or null>,
      "position": [<x mm>, <y mm>],
      "width": <mm>,
      "depth": <mm>,
      "height": <mm>,
      "rotation": <degrees>
    }
  ],
  "pods": [
    {
      "id": "pod_001",
      "podType": "phone-booth" | "focus-pod" | "song-booth",
      "position": [<x mm>, <y mm>],
      "width": <mm>,
      "depth": <mm>,
      "height": 2400
    }
  ],
  "coreAreas": [
    {
      "id": "core_001",
      "name": "LIFT CORE",
      "coreType": "lift" | "stair" | "services" | "toilets",
      "boundary": [[<x mm>,<y mm>], [<x mm>,<y mm>], [<x mm>,<y mm>], [<x mm>,<y mm>]],
      "height": 3000
    }
  ],
  "structuralGrid": {
    "horizontalLines": [
      { "id": "a1", "x": <mm> },
      { "id": "a2", "x": <mm> }
    ],
    "verticalLines": [
      { "id": "aA", "y": <mm> },
      { "id": "aB", "y": <mm> }
    ],
    "columnSize": 400
  },
  "bounds": {
    "minX": 0,
    "minY": 0,
    "maxX": <mm, e.g. 60000>,
    "maxY": <mm, e.g. 34500>,
    "width": <maxX - minX>,
    "depth": <maxY - minY>
  },
  "defaults": {
    "ceilingHeight": 3000,
    "wallThickness": 150,
    "floorFinish": "carpet-tile",
    "units": "mm"
  },
  "confidence": <0.0–1.0>,
  "notes": "<brief summary of inferences made>"
}`

  const message = await anthropic.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 16000,
    system:     REASON_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: REASON_USER_PROMPT }],
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

    console.log(`[Stage2] Normalised: ${geometry.walls?.length ?? 0} walls, ${geometry.rooms?.length ?? 0} rooms, ${geometry.columns?.length ?? 0} columns, ${geometry.pods?.length ?? 0} pods`)
    return geometry
  } catch {
    throw new Error('Claude returned invalid JSON in Stage 2')
  }
}
