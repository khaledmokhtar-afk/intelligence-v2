export interface ParsedGeometry {
  drawingType: 'architectural' | 'mechanical' | 'structural' | 'other'
  scale: string | null
  units: 'mm' | 'cm' | 'm' | 'inches' | 'feet'
  viewType: 'plan' | 'elevation' | 'section' | 'isometric' | 'detail'
  elements: Array<{
    type: 'wall' | 'line' | 'arc' | 'circle' | 'opening' | 'column' | 'beam' | 'slab' | 'stair'
    coords: [number, number, number, number]
    properties: {
      thickness?: number
      lineWeight?: 'heavy' | 'medium' | 'light'
      lineType?: 'solid' | 'dashed' | 'dotted'
      layer?: string
    }
  }>
  dimensions: Array<{
    value: number
    unit: string
    from: [number, number]
    to: [number, number]
    label: string
  }>
  annotations: Array<{
    text: string
    position: [number, number]
    fontSize: 'large' | 'medium' | 'small'
  }>
  roomLabels: Array<{
    name: string
    center: [number, number]
    area: number
  }>
  titleBlock: {
    projectName?: string
    drawingNumber?: string
    scale?: string
    date?: string
  } | null
}

export interface Wall {
  id: string
  start: [number, number]
  end: [number, number]
  thickness?: number
  height?: number
  material?: 'concrete' | 'brick' | 'drywall' | 'glass' | 'unknown'
  isExternal?: boolean
  isStructural?: boolean
}

export interface Opening {
  id: string
  type: 'door' | 'window'
  wallId: string
  positionAlongWall: number
  width: number
  height: number
  sillHeight: number
}

export interface Room {
  id: string
  name: string
  boundary: [number, number][]
  area?: number
  ceilingHeight?: number
}

export interface StructuralElement {
  id: string
  type: 'column' | 'beam' | 'slab'
  geometry: {
    x: number
    y: number
    width?: number
    depth?: number
    height?: number
  }
}

export interface Floor {
  id: string
  level: number
  height: number
  rooms: string[]
}

export interface NormalizedGeometry {
  walls: Wall[]
  openings: Opening[]
  rooms: Room[]
  structuralElements: StructuralElement[]
  floors: Floor[]
  defaultHeight: number
  units: 'mm' | 'cm' | 'm' | 'inches' | 'feet'
  bounds: {
    minX: number
    maxX: number
    minY: number
    maxY: number
  }
  confidence: number
  notes?: string
}
