export interface ParsedGeometry {
  drawingType: string
  subType?: string
  scale: string
  units: string
  viewType: string
  totalWidth?: number
  totalDepth?: number
  ceilingHeight?: number
  structuralGrid?: {
    horizontal: Array<{ id: string; x: number }>
    vertical:   Array<{ id: string; y: number }>
    columnSize?: number
  }
  walls:        RawWall[]
  glazing?:     RawGlazing[]
  doors?:       RawDoor[]
  rooms:        RawRoom[]
  furniture?:   RawFurniture[]
  equipment?:   RawEquipment[]
  dimensions?:  RawDimension[]
  annotations?: RawAnnotation[]
  coreAreas?:   RawCoreArea[]
  titleBlock?:  TitleBlock
}

export interface NormalizedGeometry {
  walls:          Wall[]
  glazing:        Glazing[]
  doors:          Door[]
  columns:        Column[]
  rooms:          Room[]
  furniture:      Furniture[]
  pods:           Pod[]
  coreAreas:      CoreArea[]
  structuralGrid: StructuralGrid
  bounds:         Bounds
  defaults:       Defaults
  confidence:     number
  notes:          string
}

export interface Wall {
  id: string
  start: [number, number]
  end: [number, number]
  thickness: number
  height: number
  material: string
  layer: string
  isExternal: boolean
  isStructural: boolean
  isFitout: boolean
  color?: string
}

export interface Glazing {
  id: string
  start: [number, number]
  end: [number, number]
  height: number
  thickness: number
  layer: string
}

export interface Door {
  id: string
  wallId: string
  insertionPoint: [number, number]
  width: number
  height: number
  thickness: number
  swingAngle: number
  layer: string
}

export interface Column {
  id: string
  gridRef?: string
  position: [number, number]
  width: number
  depth: number
  height: number
  material: string
  layer: string
}

export interface Room {
  id: string
  name: string
  number?: string
  boundary: [number, number][]
  area: number
  ceilingHeight: number
  floorFinish?: string
  roomType?: string
  layer: string
  centroid?: [number, number]
}

export interface Furniture {
  id: string
  type: string
  label: string
  position: [number, number]
  width: number
  depth: number
  height: number
  rotation?: number
  layer: string
  color?: string
}

export interface Pod {
  id: string
  type: string
  position: [number, number]
  width: number
  depth: number
  height: number
  layer: string
  color?: string
}

export interface CoreArea {
  id: string
  name: string
  boundary: [number, number][]
  height: number
  type: string
  layer: string
  color?: string
}

export interface StructuralGrid {
  horizontalLines: Array<{ id: string; x: number; yStart: number; yEnd: number }>
  verticalLines:   Array<{ id: string; y: number; xStart: number; xEnd: number }>
  layer: string
}

export interface Bounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
  width: number
  depth: number
}

export interface Defaults {
  ceilingHeight: number
  units: string
  scale: string
  drawingType: string
}

// Raw types from Stage 1 output
interface RawWall      { id: string; type: string; start: number[]; end: number[]; thickness?: number; height?: number; isExternal?: boolean; isStructural?: boolean; isFitout?: boolean }
interface RawGlazing   { id: string; start: number[]; end: number[]; height?: number; type?: string }
interface RawDoor      { id: string; wallId?: string; position: number[]; width: number; height: number; swingDirection?: string; type?: string }
interface RawRoom      { id: string; name: string; boundary?: number[][]; area?: number; ceilingHeight?: number; roomType?: string }
interface RawFurniture { id: string; type: string; label?: string; position: number[]; width?: number; depth?: number; height?: number; rotation?: number }
interface RawEquipment { id: string; code: string; name: string; position: number[] }
interface RawDimension { value: number; unit: string; from: number[]; to: number[]; label?: string }
interface RawAnnotation{ text: string; position: number[]; fontSize?: string }
interface RawCoreArea  { id: string; name: string; boundary: number[][]; type: string; hatchType?: string }
interface TitleBlock   { client?: string; project?: string; drawingTitle?: string; drawingNumber?: string; revision?: string; scale?: string; architect?: string }

// Structural element kept for backwards-compat with existing job-processor
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
