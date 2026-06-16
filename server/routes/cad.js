const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const { getApiKey } = require('./settings');

const router = express.Router();
const upload = multer({ dest: path.join(__dirname, '../../data/cad-uploads/') });

function getClient() {
  const key = getApiKey();
  if (!key) throw new Error('Anthropic API key not configured. Please add it in Settings.');
  return new Anthropic({ apiKey: key });
}

const SYSTEM_PROMPT = `You are an expert CAD engineer specializing in reading 2D engineering drawings and converting them to 3D models.

When given a PDF or image containing 2D engineering drawings (orthographic projections, technical drawings, blueprints), you must:
1. Identify all geometric features: walls, holes, extrusions, cutouts, slots, ribs, chamfers, fillets
2. Understand the different views: Top/Plan view, Front/Elevation view, Side view, Isometric view
3. Extract dimensions (if labeled) or estimate proportional sizes
4. Reconstruct the 3D object from the 2D views

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "title": "descriptive name of the part/object",
  "description": "brief description of what the object is",
  "unit": "mm",
  "objects": [
    {
      "id": "unique_id",
      "type": "box|cylinder|sphere|cone|torus|wedge",
      "name": "feature name",
      "operation": "add|subtract",
      "position": { "x": 0, "y": 0, "z": 0 },
      "dimensions": { "width": 100, "height": 50, "depth": 80 },
      "rotation": { "x": 0, "y": 0, "z": 0 },
      "color": "#8aa0b0",
      "notes": "optional notes about this feature"
    }
  ],
  "views_detected": ["top", "front", "side"],
  "drawing_type": "mechanical|architectural|electrical|schematic|other",
  "confidence": 0.85
}

Rules:
- Coordinate system: X=right, Y=up, Z=toward viewer
- All dimensions in mm (estimate if not labeled, use 100mm as base unit for unknown sizes)
- Use "subtract" operation for holes, cutouts, and pockets
- Always include at least one "add" object (the main body)
- position is the CENTER of the object
- For cylinders: dimensions.width = diameter, dimensions.height = length/height
- Colors: use realistic metal gray (#8aa0b0), or match material if evident
- If the drawing is not a mechanical/CAD drawing, still create a reasonable 3D interpretation
- Maximum 20 objects per model`;

router.post('/analyze', upload.single('pdf'), async (req, res) => {
  const filePath = req.file?.path;
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const client = getClient();
    const fileBuffer = fs.readFileSync(filePath);
    const base64 = fileBuffer.toString('base64');
    const mimeType = req.file.mimetype === 'application/pdf' ? 'application/pdf' : req.file.mimetype;

    // Use Claude's vision to analyze the drawing
    const contentBlocks = [];

    if (mimeType === 'application/pdf') {
      contentBlocks.push({
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: base64,
        },
      });
    } else {
      // image fallback
      contentBlocks.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: mimeType,
          data: base64,
        },
      });
    }

    contentBlocks.push({
      type: 'text',
      text: 'Analyze this engineering drawing and return a 3D model representation as JSON. Follow the system instructions exactly.',
    });

    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: contentBlocks }],
    });

    const rawText = response.content[0].text.trim();

    // Strip markdown code fences if present
    const jsonText = rawText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();

    let geometry;
    try {
      geometry = JSON.parse(jsonText);
    } catch (e) {
      // Try to extract JSON from response
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) {
        geometry = JSON.parse(match[0]);
      } else {
        throw new Error('AI did not return valid JSON. Raw response: ' + rawText.substring(0, 200));
      }
    }

    res.json({ success: true, geometry });
  } catch (err) {
    console.error('CAD analyze error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (filePath) fs.unlink(filePath, () => {});
  }
});

// Generate DXF from geometry
router.post('/export-dxf', express.json(), (req, res) => {
  try {
    const { geometry } = req.body;
    if (!geometry) return res.status(400).json({ error: 'No geometry provided' });

    const dxf = generateDXF(geometry);

    res.setHeader('Content-Type', 'application/dxf');
    res.setHeader('Content-Disposition', `attachment; filename="${geometry.title || 'model'}.dxf"`);
    res.send(dxf);
  } catch (err) {
    console.error('DXF export error:', err);
    res.status(500).json({ error: err.message });
  }
});

function generateDXF(geometry) {
  const lines = [];

  // DXF Header
  lines.push('0\nSECTION');
  lines.push('2\nHEADER');
  lines.push('9\n$ACADVER\n1\nAC1015');
  lines.push('9\n$INSUNITS\n70\n4'); // mm
  lines.push('0\nENDSEC');

  // Entities section
  lines.push('0\nSECTION');
  lines.push('2\nENTITIES');

  const addObjects = (geometry.objects || []).filter(o => o.operation !== 'subtract');

  for (const obj of addObjects) {
    const pos = obj.position || { x: 0, y: 0, z: 0 };
    const dim = obj.dimensions || { width: 100, height: 50, depth: 80 };

    if (obj.type === 'box' || obj.type === 'wedge') {
      // Draw box as 3D face entities (6 faces)
      const hw = (dim.width || 100) / 2;
      const hh = (dim.height || 50) / 2;
      const hd = (dim.depth || 80) / 2;
      const cx = pos.x, cy = pos.y, cz = pos.z;

      const corners = [
        [cx - hw, cy - hh, cz - hd],
        [cx + hw, cy - hh, cz - hd],
        [cx + hw, cy + hh, cz - hd],
        [cx - hw, cy + hh, cz - hd],
        [cx - hw, cy - hh, cz + hd],
        [cx + hw, cy - hh, cz + hd],
        [cx + hw, cy + hh, cz + hd],
        [cx - hw, cy + hh, cz + hd],
      ];

      const faces = [
        [0, 1, 2, 3], // front
        [4, 5, 6, 7], // back
        [0, 1, 5, 4], // bottom
        [2, 3, 7, 6], // top
        [0, 3, 7, 4], // left
        [1, 2, 6, 5], // right
      ];

      for (const face of faces) {
        lines.push('0\n3DFACE');
        lines.push('8\n0'); // layer
        const pts = face.map(i => corners[i]);
        lines.push(`10\n${pts[0][0]}\n20\n${pts[0][1]}\n30\n${pts[0][2]}`);
        lines.push(`11\n${pts[1][0]}\n21\n${pts[1][1]}\n31\n${pts[1][2]}`);
        lines.push(`12\n${pts[2][0]}\n22\n${pts[2][1]}\n32\n${pts[2][2]}`);
        lines.push(`13\n${pts[3][0]}\n23\n${pts[3][1]}\n33\n${pts[3][2]}`);
      }
    } else if (obj.type === 'cylinder') {
      // Draw cylinder as a circle + line
      const r = (dim.width || 50) / 2;
      const h = dim.height || 100;
      lines.push('0\nCIRCLE');
      lines.push('8\n0');
      lines.push(`10\n${pos.x}\n20\n${pos.z}\n30\n${pos.y - h / 2}`);
      lines.push(`40\n${r}`);
      lines.push('0\nCIRCLE');
      lines.push('8\n0');
      lines.push(`10\n${pos.x}\n20\n${pos.z}\n30\n${pos.y + h / 2}`);
      lines.push(`40\n${r}`);
      // 4 vertical lines
      for (const angle of [0, 90, 180, 270]) {
        const rad = (angle * Math.PI) / 180;
        const lx = pos.x + r * Math.cos(rad);
        const lz = pos.z + r * Math.sin(rad);
        lines.push('0\nLINE');
        lines.push('8\n0');
        lines.push(`10\n${lx}\n20\n${lz}\n30\n${pos.y - h / 2}`);
        lines.push(`11\n${lx}\n21\n${lz}\n31\n${pos.y + h / 2}`);
      }
    } else if (obj.type === 'sphere') {
      const r = (dim.width || 50) / 2;
      lines.push('0\nCIRCLE');
      lines.push('8\n0');
      lines.push(`10\n${pos.x}\n20\n${pos.z}\n30\n${pos.y}`);
      lines.push(`40\n${r}`);
    }
  }

  lines.push('0\nENDSEC');
  lines.push('0\nEOF');

  return lines.join('\n');
}

module.exports = router;
