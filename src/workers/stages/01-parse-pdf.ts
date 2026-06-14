import Anthropic from '@anthropic-ai/sdk'
import { anthropic }    from '@/lib/anthropic'
import { s3, uploadToS3 } from '@/lib/s3'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { fromBuffer }   from 'pdf2pic'
import type { ParsedGeometry } from '@/types'

export async function parsePDF(jobId: string, inputKey: string): Promise<ParsedGeometry> {
  // 1. Download PDF from R2
  const response = await s3.send(new GetObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key:    inputKey,
  }))
  const pdfBuffer = Buffer.from(await response.Body!.transformToByteArray())

  // 2. Convert PDF pages to images
  const converter = fromBuffer(pdfBuffer, {
    density: 200,
    format:  'png',
    width:   2000,
    height:  2000,
  })

  const pageCount  = Math.min(5, response.Metadata?.pages ? parseInt(response.Metadata.pages) : 1)
  const pageImages: string[] = []

  for (let page = 1; page <= pageCount; page++) {
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
  const PARSE_SYSTEM_PROMPT = `You are an expert engineering drawing parser with deep knowledge
of architectural, mechanical, structural, and civil engineering drawings.

Your task is to analyze 2D engineering drawings from PDF pages and extract all geometric
and semantic information needed to reconstruct the drawing in 3D.

CRITICAL: You must return ONLY valid JSON. No explanations, no markdown, no code blocks.
Just raw JSON matching the schema exactly.`

  const PARSE_USER_PROMPT = `Analyze this engineering drawing and extract all geometric elements.

Return this exact JSON structure (no other text):
{
  "drawingType": "architectural" | "mechanical" | "structural" | "other",
  "scale": "1:50" | "1:100" | null,
  "units": "mm" | "cm" | "m" | "inches" | "feet",
  "viewType": "plan" | "elevation" | "section" | "isometric" | "detail",
  "elements": [
    {
      "type": "wall" | "line" | "arc" | "circle" | "opening" | "column" | "beam" | "slab" | "stair",
      "coords": [x1, y1, x2, y2],
      "properties": {
        "thickness": 200,
        "lineWeight": "heavy" | "medium" | "light",
        "lineType": "solid" | "dashed" | "dotted",
        "layer": "WALLS" | "DOORS" | "WINDOWS" | "DIMS" | "TEXT" | "STRUCTURAL"
      }
    }
  ],
  "dimensions": [
    {
      "value": 3500,
      "unit": "mm",
      "from": [x1, y1],
      "to": [x2, y2],
      "label": "3500"
    }
  ],
  "annotations": [
    {
      "text": "BEDROOM 1",
      "position": [x, y],
      "fontSize": "large" | "medium" | "small"
    }
  ],
  "roomLabels": [
    {
      "name": "Living Room",
      "center": [x, y],
      "area": 25.5
    }
  ],
  "titleBlock": {
    "projectName": "Residential House",
    "drawingNumber": "A-101",
    "scale": "1:100",
    "date": "2024-01-15"
  }
}

Important notes:
- Coordinates should be in drawing units (not pixels)
- Wall thickness is typically 200-300mm for external, 100-150mm for internal
- Openings (doors/windows) interrupt wall segments
- Use your engineering knowledge to infer missing information
- If scale is visible, use it to normalize coordinates to real-world millimeters`

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
    content.push({
      type: 'text',
      text: `Page ${i + 1} of ${pageImages.length}`,
    })
  }
  content.push({ type: 'text', text: PARSE_USER_PROMPT })

  const message = await anthropic.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 8192,
    system:     PARSE_SYSTEM_PROMPT,
    messages: [{
      role:    'user',
      content: content,
    }],
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

    return parsed
  } catch (err) {
    console.error('Failed to parse Claude response:', responseText.slice(0, 500))
    throw new Error('Claude returned invalid JSON in Stage 1')
  }
}
