import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { DataPoint, ChartType, VizConfig, PointStyle, ColorMode, ShapeType } from '../types';

interface VizRendererProps {
  data: DataPoint[];
  prevConfig: VizConfig;
  nextConfig: VizConfig;
  pointStyle: PointStyle;
  progress: number; // 0 to 1 (local progress between steps)
}

export const VizRenderer: React.FC<VizRendererProps> = ({
  data,
  prevConfig,
  nextConfig,
  pointStyle,
  progress,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const width = 800;
  const height = 600;
  const margin = { top: 40, right: 40, bottom: 40, left: 40 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Helper to calculate positions based on chart type
  const calculatePositions = (config: VizConfig, dataset: DataPoint[]) => {
    const positions = new Map<string, { x: number; y: number }>();
    
    if (config.chartType === ChartType.GRID) {
      const cols = 10;
      const cellWidth = innerWidth / cols;
      const cellHeight = innerWidth / cols; // square aspect
      dataset.forEach((d, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        positions.set(d.id, {
          x: col * cellWidth + cellWidth / 2,
          y: row * cellHeight + cellHeight / 2,
        });
      });
    } else if (config.chartType === ChartType.SCATTER) {
      const xScale = d3.scaleLinear().domain([0, 100]).range([0, innerWidth]);
      const yScale = d3.scaleLinear().domain([0, 100]).range([innerHeight, 0]);
      dataset.forEach(d => {
        positions.set(d.id, {
          x: xScale(d.valueA),
          y: yScale(d.valueB),
        });
      });
    } else if (config.chartType === ChartType.BAR) {
      const categories = Array.from(new Set(dataset.map(d => d.category))).sort();
      const xScale = d3.scaleBand().domain(categories).range([0, innerWidth]).padding(0.4);
      const counts: Record<string, number> = {};
      // Use dynamic radius for spacing calculation
      const spacing = pointStyle.radius * 2.2; 
      dataset.forEach(d => {
        if (!counts[d.category]) counts[d.category] = 0;
        const count = counts[d.category];
        positions.set(d.id, {
          x: (xScale(d.category) || 0) + xScale.bandwidth() / 2,
          y: innerHeight - (count * spacing) - pointStyle.radius,
        });
        counts[d.category]++;
      });
    } else if (config.chartType === ChartType.RADIAL) {
        const radius = Math.min(innerWidth, innerHeight) / 2.5;
        const angleScale = d3.scaleLinear().domain([0, dataset.length]).range([0, 2 * Math.PI]);
        dataset.forEach((d, i) => {
            const angle = angleScale(i);
            const r = radius + (d.valueA / 100) * 40; 
            positions.set(d.id, {
                x: innerWidth / 2 + Math.cos(angle) * r,
                y: innerHeight / 2 + Math.sin(angle) * r,
            });
        });
    }

    return positions;
  };

  const startPositions = useMemo(() => calculatePositions(prevConfig, data), [data, prevConfig, pointStyle.radius]);
  const endPositions = useMemo(() => calculatePositions(nextConfig, data), [data, nextConfig, pointStyle.radius]);

  // Color scale
  const categories = useMemo(() => Array.from(new Set(data.map(d => d.category))).sort(), [data]);
  const colorScale = useMemo(() => {
    // Use the palette from pointStyle
    return d3.scaleOrdinal(pointStyle.palette).domain(categories);
  }, [categories, pointStyle.palette]);

  // Shape Generator
  const getD3Symbol = (shape: ShapeType) => {
    switch (shape) {
      case ShapeType.SQUARE: return d3.symbolSquare;
      case ShapeType.DIAMOND: return d3.symbolDiamond;
      case ShapeType.TRIANGLE: return d3.symbolTriangle;
      case ShapeType.STAR: return d3.symbolStar;
      case ShapeType.CROSS: return d3.symbolCross;
      case ShapeType.CIRCLE: 
      default: return d3.symbolCircle;
    }
  };

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    
    // Join data to paths instead of circles for shape flexibility
    const points = svg.selectAll<SVGPathElement, DataPoint>('path')
      .data(data, d => d.id);

    // Enter
    const enter = points.enter()
      .append('path')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1);

    // Symbol generator for the current frame
    const symbolGenerator = d3.symbol()
      .type(getD3Symbol(pointStyle.shape))
      .size(pointStyle.radius * pointStyle.radius * Math.PI); // d3.symbol size is area

    // Update (position interpolation + style updates)
    points.merge(enter as any)
      .each(function(d) {
        const start = startPositions.get(d.id) || { x: 0, y: 0 };
        const end = endPositions.get(d.id) || { x: 0, y: 0 };
        
        const ease = d3.easeCubicInOut(progress); // Smooth easing

        const currentX = start.x + (end.x - start.x) * ease;
        const currentY = start.y + (end.y - start.y) * ease;
        
        // Determine color based on mode
        const fillColor = pointStyle.colorMode === ColorMode.CATEGORY 
          ? colorScale(d.category) 
          : pointStyle.baseColor;

        d3.select(this)
          .attr('transform', `translate(${currentX},${currentY})`)
          .attr('d', symbolGenerator)
          .attr('opacity', pointStyle.opacity)
          .attr('fill', fillColor);
      });

    points.exit().remove();

  }, [data, startPositions, endPositions, progress, pointStyle, colorScale]);

  return (
    <div className="w-full h-full flex items-center justify-center overflow-hidden relative">
      <svg 
        ref={svgRef} 
        viewBox={`0 0 ${width} ${height}`} 
        className="w-full h-full max-w-4xl max-h-[80vh] drop-shadow-2xl"
        style={{ overflow: 'visible' }}
      >
          <g transform={`translate(${margin.left},${margin.top})`} />
      </svg>

      {/* Legend Overlay */}
      {pointStyle.colorMode === ColorMode.CATEGORY && categories.length > 0 && (
        <div className="absolute bottom-8 left-8 bg-white/60 backdrop-blur-xl border border-white/50 p-4 rounded-2xl shadow-xl max-w-[200px] max-h-[300px] overflow-y-auto pointer-events-auto transition-opacity duration-300 hover:opacity-100 opacity-80">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Categories</h3>
            <div className="flex flex-col gap-2">
                {categories.map(cat => (
                    <div key={cat} className="flex items-center gap-2">
                        <div 
                            className="w-3 h-3 shadow-sm border border-white/50 shrink-0" 
                            style={{ backgroundColor: colorScale(cat), borderRadius: pointStyle.shape === ShapeType.CIRCLE ? '50%' : '2px' }}
                        />
                        <span className="text-xs font-semibold text-slate-700 truncate" title={cat}>{cat}</span>
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  );
};