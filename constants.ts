
import { DataPoint, ChartType, PointStyle, ColorMode, StoryStep, TextPosition, ShapeType, LegendPosition } from './types';

export const INITIAL_DATA: DataPoint[] = Array.from({ length: 50 }, (_, i) => ({
  id: `item-${i}`,
  category: i < 15 ? 'A' : i < 30 ? 'B' : 'C',
  valueA: Math.floor(Math.random() * 100),
  valueB: Math.floor(Math.random() * 100),
  label: `Item ${i + 1}`,
}));

export const CHART_OPTIONS = [
  { label: 'Grid Layout', value: ChartType.GRID },
  { label: 'Scatter Plot', value: ChartType.SCATTER },
  { label: 'Bar Chart (Stacked)', value: ChartType.BAR },
  { label: 'Radial/Circular', value: ChartType.RADIAL },
  { label: 'Histogram', value: ChartType.HISTOGRAM },
  { label: 'Dot Plot', value: ChartType.DOTPLOT },
  { label: 'Beeswarm', value: ChartType.BEESWARM },
  { label: 'Violin Plot', value: ChartType.VIOLIN },
];

export const POSITION_OPTIONS = [
  { label: 'Center', value: TextPosition.CENTER },
  { label: 'Top', value: TextPosition.TOP },
  { label: 'Bottom', value: TextPosition.BOTTOM },
  { label: 'Left', value: TextPosition.LEFT },
  { label: 'Right', value: TextPosition.RIGHT },
];

export const SHAPE_OPTIONS = [
  { label: 'Circle', value: ShapeType.CIRCLE },
  { label: 'Square', value: ShapeType.SQUARE },
  { label: 'Diamond', value: ShapeType.DIAMOND },
  { label: 'Triangle', value: ShapeType.TRIANGLE },
  { label: 'Star', value: ShapeType.STAR },
  { label: 'Cross', value: ShapeType.CROSS },
];

export const LEGEND_POSITION_OPTIONS = [
  { label: 'Bottom Left', value: LegendPosition.BOTTOM_LEFT },
  { label: 'Bottom Right', value: LegendPosition.BOTTOM_RIGHT },
  { label: 'Top Left', value: LegendPosition.TOP_LEFT },
  { label: 'Top Right', value: LegendPosition.TOP_RIGHT },
];

export const COLOR_PALETTES = {
  PASTEL: ['#fbb4ae', '#b3cde3', '#ccebc5', '#decbe4', '#fed9a6', '#ffffcc', '#e5d8bd', '#fddaec'],
  VIBRANT: ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#ffff33', '#a65628', '#f781bf'],
  OCEAN: ['#ffffd9', '#edf8b1', '#c7e9b4', '#7fcdbb', '#41b6c4', '#1d91c0', '#225ea8', '#0c2c84'],
  SUNSET: ['#fff7bc', '#fee391', '#fec44f', '#fe9929', '#ec7014', '#cc4c02', '#993404', '#662506'],
  NEON: ['#FF00FF', '#00FFFF', '#FFFF00', '#00FF00', '#FF0000', '#8A2BE2'],
  ELEGANT: ['#8dd3c7', '#ffffb3', '#bebada', '#fb8072', '#80b1d3', '#fdb462', '#b3de69', '#fccde5']
};

export const DEFAULT_POINT_STYLE: PointStyle = {
  radius: 8,
  opacity: 0.8,
  colorMode: ColorMode.CATEGORY,
  baseColor: '#FF8F8F',
  shape: ShapeType.CIRCLE,
  palette: COLOR_PALETTES.PASTEL,
  legendPosition: LegendPosition.BOTTOM_LEFT,
  tooltipFields: [],
};

export const DEFAULT_STEPS: StoryStep[] = [
  {
    id: 'step-1',
    chartType: ChartType.BAR,
    text: 'It starts with a simple breakdown...',
    textPosition: TextPosition.CENTER,
  },
  {
    id: 'step-2',
    chartType: ChartType.SCATTER,
    text: 'Looking at the correlation...',
    textPosition: TextPosition.RIGHT,
  },
  {
    id: 'step-3',
    chartType: ChartType.RADIAL,
    text: 'Finally, the complete cycle.',
    textPosition: TextPosition.BOTTOM,
  }
];
