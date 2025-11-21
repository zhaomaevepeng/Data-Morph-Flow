
export enum ChartType {
  GRID = 'GRID',
  SCATTER = 'SCATTER',
  BAR = 'BAR',
  RADIAL = 'RADIAL',
  HISTOGRAM = 'HISTOGRAM',
  DOTPLOT = 'DOTPLOT',
  BEESWARM = 'BEESWARM',
  VIOLIN = 'VIOLIN',
}

export enum TextPosition {
  CENTER = 'CENTER',
  TOP = 'TOP',
  BOTTOM = 'BOTTOM',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
}

export enum ShapeType {
  CIRCLE = 'CIRCLE',
  SQUARE = 'SQUARE',
  DIAMOND = 'DIAMOND',
  TRIANGLE = 'TRIANGLE',
  STAR = 'STAR',
  CROSS = 'CROSS',
}

export enum LegendPosition {
  TOP_LEFT = 'TOP_LEFT',
  TOP_RIGHT = 'TOP_RIGHT',
  BOTTOM_LEFT = 'BOTTOM_LEFT',
  BOTTOM_RIGHT = 'BOTTOM_RIGHT',
}

export interface DataPoint {
  id: string;
  category: string;
  valueA: number; // Used for Scatter X or Size
  valueB: number; // Used for Scatter Y or Height
  label: string;
  color?: string;
  [key: string]: any; // Allow dynamic fields from uploaded data
}

export interface DataMapping {
  category: string;
  valueA: string;
  valueB: string;
  label: string;
}

export interface VizConfig {
  chartType: ChartType;
  xKey: keyof DataPoint;
  yKey: keyof DataPoint;
}

export interface StoryStep {
  id: string;
  chartType: ChartType;
  text: string;
  textPosition: TextPosition;
}

export enum ColorMode {
  CATEGORY = 'CATEGORY',
  SINGLE = 'SINGLE',
}

export interface PointStyle {
  radius: number;
  opacity: number;
  colorMode: ColorMode;
  baseColor: string;
  shape: ShapeType;
  palette: string[];
  legendPosition: LegendPosition;
  tooltipFields: string[];
}

export interface AppState {
  data: DataPoint[];
  steps: StoryStep[];
  isGenerating: boolean;
}
