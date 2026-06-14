import Anthropic from '@anthropic-ai/sdk'
import { anthropic } from '@/lib/anthropic'
import { s3, uploadToS3 } from '@/lib/s3'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { fromBuffer } from 'pdf2pic'
import type { ParsedGeometry } from '@/types'

export async function parsePDF(
  jobId: string,
  inputKey: string,
  pagesCount?: number
): Promise<ParsedGeometry> {
  // 1. Download PDF from R2
  const response = await s3.send(new GetObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key:    inputKey,
  }))
  const pdfBuffer = Buffer.from(await response.Body!.transformToByteArray())

  // 2. Convert PDF pages to images at 200 DPI
  const converter = fromBuffer(pdfBuffer, {
    density: 200,
    format:  'png',
    width:   3000,
    height:  3000,
  })

  const pageLimit  = Math.min(pagesCount ?? 1, 6)
  const pageImages: string[] = []

  for (let page = 1; page <= pageLimit; page++) {
    const result = await converter(page, { responseType: 'buffer' })
    if (result.buffer) {
      const base64 = result.buffer.toString('base64')
      pageImages.push(base64)
      await uploadToS3(
        `intermediate/${jobId}/page-${String(page).padStart(3, '0')}.png`,
        result.buffer,
        'image/png'
      )
    }
  }

  if (pageImages.length === 0) {
    throw new Error('Could not extract any pages from PDF')
  }

  // 3. Send to Claude Vision
  const PARSE_SYSTEM_PROMPT = `You are an expert architectural drawing parser specialising in
professional interior fit-out drawings produced by Australian and Middle-Eastern practices
(Bluehaus Group style). You have deep knowledge of AS1100/ISO architectural drawing conventions.

CRITICAL: Return ONLY valid JSON with no markdown fences, no prose, no code blocks. Raw JSON only.`

  const PARSE_USER_PROMPT = `Analyse this professional architectural interior fit-out drawing
(General Arrangement Plan, 1:100 scale, dimensions in millimetres).

DRAWING CONVENTIONS TO RECOGNISE:
• Scale: 1:100 unless annotated otherwise. Coordinates in mm.
• Wall types by hatch pattern:
  - Heavy solid fill / cross-hatch = concrete core / base-build structural wall (200–350 mm thick)
  - Diagonal hatch = joinery / millwork (100–150 mm)
  - Solid outline, no hatch = fit-out partition (100–150 mm, demountable or fixed)
  - Dashed outline = demountable / NIC partition
  - Curtain wall / glazing line = thin single line or double line with glazing symbol
• Structural column grid:
  - Horizontal grid lines labelled a1, a2 … a13 (left→right)
  - Vertical grid lines labelled aA, aB … aG (bottom→top)
  - Columns sit at grid intersections, typically 400×400 mm RC
• Room tags: name on top line, number below in format 114-XXX (level 14)
• Equipment codes in pantry / kitchen areas:
  CM=Coffee Machine, UCF=Undercounter Fridge, DW=Dishwasher, ZT=Zip Tap,
  REF=Refrigerator, MV=Microwave, WD=Water Dispenser, CP=Copy/Printer,
  LED=LED Screen, NS=Nespresso, SH=Shredder, ST=Sterilizer, J=Juicer, K=Kettle, T=Toaster, S=Sink
• Phone booths / SONG pods: small enclosed boxes 1000×1000 to 1200×2000 mm, labelled "PHONE BOOTH" or "SONG"
• SCREEN annotations mark wall-mounted or free-standing display screens
• Title block in bottom-right corner contains project name, drawing number, scale, revision, date

OUTPUT — return this exact JSON (populate every array you can identify, use [] if none visible):
{
  "drawingType": "interior-fitout",
  "subType": "general-arrangement",
  "scale": "1:100",
  "units": "mm",
  "viewType": "plan",
  "totalWidth": <overall drawing width in mm, e.g. 60000>,
  "totalDepth": <overall drawing depth in mm, e.g. 34500>,
  "ceilingHeight": 3000,
  "structuralGrid": {
    "horizontal": [
      { "id": "a1", "x": <x coordinate in mm> },
      { "id": "a2", "x": <x coordinate in mm> }
    ],
    "vertical": [
      { "id": "aA", "y": <y coordinate in mm> },
      { "id": "aB", "y": <y coordinate in mm> }
    ],
    "columnSize": 400
  },
  "walls": [
    {
      "id": "wall_001",
      "start": [<x1 mm>, <y1 mm>],
      "end":   [<x2 mm>, <y2 mm>],
      "thickness": <mm, e.g. 200>,
      "wallType": "concrete-core" | "joinery" | "fitout-partition" | "demountable" | "glazing-frame",
      "isStructural": <true if concrete core or base-build>,
      "isFitout": <true if interior fit-out partition>,
      "layer": "A-WALL-FULL" | "A-WALL-PART" | "A-WALL-DEMO"
    }
  ],
  "glazing": [
    {
      "id": "glaz_001",
      "start": [<x1 mm>, <y1 mm>],
      "end":   [<x2 mm>, <y2 mm>],
      "thickness": 50,
      "glazingType": "curtain-wall" | "internal-glass" | "shopfront",
      "layer": "A-GLAZ"
    }
  ],
  "doors": [
    {
      "id": "door_001",
      "position": [<x mm>, <y mm>],
      "width": 900,
      "height": 2100,
      "swingAngle": 90,
      "wallId": "wall_001",
      "roomFrom": "114-001",
      "roomTo": "114-002"
    }
  ],
  "rooms": [
    {
      "id": "r_001",
      "name": "RECEPTION",
      "number": "114-001",
      "centroid": [<cx mm>, <cy mm>],
      "boundary": [[<x mm>,<y mm>], [<x mm>,<y mm>], [<x mm>,<y mm>], [<x mm>,<y mm>]],
      "area": <sq m as float>,
      "roomType": "reception" | "meeting" | "office" | "amenity" | "services" | "circulation" | "open-plan" | "wellness" | "focus" | "breakout"
    }
  ],
  "furniture": [
    {
      "id": "furn_001",
      "type": "desk" | "chair" | "table" | "locker" | "cabinet" | "credenza" | "sofa" | "screen" | "other",
      "label": <text label if any>,
      "position": [<x mm>, <y mm>],
      "width": <mm>,
      "depth": <mm>,
      "height": <mm, estimate: desk=750, locker=1800, full-height-cabinet=2400, credenza=750>,
      "rotation": <degrees 0–359>
    }
  ],
  "equipment": [
    {
      "id": "eq_001",
      "code": "CM" | "UCF" | "DW" | "ZT" | "REF" | "MV" | "WD" | "CP" | "LED" | "NS" | "SH" | "ST" | "J" | "K" | "T" | "S",
      "fullName": "Coffee Machine",
      "position": [<x mm>, <y mm>],
      "roomId": "r_001"
    }
  ],
  "dimensions": [
    {
      "value": 6000,
      "unit": "mm",
      "from": [<x1 mm>, <y1 mm>],
      "to":   [<x2 mm>, <y2 mm>],
      "label": "6000",
      "axis": "horizontal" | "vertical"
    }
  ],
  "annotations": [
    {
      "text": "SCREEN",
      "position": [<x mm>, <y mm>],
      "fontSize": "large" | "medium" | "small"
    }
  ],
  "coreAreas": [
    {
      "id": "core_001",
      "name": "LIFT CORE",
      "boundary": [[<x mm>,<y mm>], [<x mm>,<y mm>], [<x mm>,<y mm>], [<x mm>,<y mm>]],
      "coreType": "lift" | "stair" | "services" | "toilets"
    }
  ],
  "titleBlock": {
    "projectName": <string or null>,
    "clientName": <string or null>,
    "drawingTitle": <string or null>,
    "drawingNumber": <string or null>,
    "scale": "1:100",
    "revision": <string or null>,
    "date": <string or null>,
    "drawnBy": <string or null>,
    "checkedBy": <string or null>
  }
}

COORDINATE SYSTEM: Origin [0,0] at bottom-left of drawing extents.
X increases right, Y increases up. All values in millimetres.
Use the visible dimension strings (6000, 3000, 7500 etc.) to calibrate coordinates accurately.
Where exact coordinates are uncertain, give best estimate based on scale and visible dimensions.`

  const content: (Anthropic.ImageBlockParam | Anthropic.TextBlockParam)[] = []

  for (let i = 0; i < pageImages.length; i++) {
    content.push({
      type:   'image',
      source: {
        type:       'base64',
        media_type: 'image/png',
        data:       pageImages[i],
      },
    })
    if (pageImages.length > 1) {
      content.push({ type: 'text', text: `Page ${i + 1} of ${pageImages.length}` })
    }
  }
  content.push({ type: 'text', text: PARSE_USER_PROMPT })

  const message = await anthropic.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 16000,
    system:     PARSE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content }],
  })

  const responseText = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')

  try {
    const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed  = JSON.parse(cleaned) as ParsedGeometry

    await uploadToS3(
      `intermediate/${jobId}/parsed.json`,
      Buffer.from(JSON.stringify(parsed, null, 2)),
      'application/json'
    )

    console.log(`[Stage1] Parsed: ${parsed.rooms?.length ?? 0} rooms, ${parsed.walls?.length ?? 0} walls`)
    return parsed
  } catch (err) {
    console.error('[Stage1] Failed to parse Claude response:', responseText.slice(0, 500))
    throw new Error('Claude returned invalid JSON in Stage 1')
  }
}
