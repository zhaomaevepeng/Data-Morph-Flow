
import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { DataPoint, ChartType, VizConfig, PointStyle, ColorMode, ShapeType, LegendPosition } from '../types';

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
  const gRef = useRef<SVGGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  const width = 800;
  const height = 600;
  const margin = { top: 40, right: 40, bottom: 40, left: 40 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Helper to calculate positions based on chart type
  const calculatePositions = (config: VizConfig, dataset: DataPoint[]) => {
    const positions = new Map<string, { x: number; y: number }>();
    const radius = pointStyle.radius;
    
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
      const spacing = radius * 2.2; 
      dataset.forEach(d => {
        if (!counts[d.category]) counts[d.category] = 0;
        const count = counts[d.category];
        positions.set(d.id, {
          x: (xScale(d.category) || 0) + xScale.bandwidth() / 2,
          y: innerHeight - (count * spacing) - radius,
        });
        counts[d.category]++;
      });

    } else if (config.chartType === ChartType.RADIAL) {
        const r = Math.min(innerWidth, innerHeight) / 2.5;
        const angleScale = d3.scaleLinear().domain([0, dataset.length]).range([0, 2 * Math.PI]);
        dataset.forEach((d, i) => {
            const angle = angleScale(i);
            const dist = r + (d.valueA / 100) * 40; 
            positions.set(d.id, {
                x: innerWidth / 2 + Math.cos(angle) * dist,
                y: innerHeight / 2 + Math.sin(angle) * dist,
            });
        });

    } else if (config.chartType === ChartType.HISTOGRAM) {
        const xScale = d3.scaleLinear().domain([0, 100]).range([0, innerWidth]);
        const bins = d3.bin<DataPoint, number>()
            .value(d => d.valueA)
            .domain([0, 100])
            .thresholds(xScale.ticks(20))
            (dataset);
        
        bins.forEach(bin => {
            bin.forEach((d, i) => {
                positions.set(d.id, {
                    x: (bin.x0! + bin.x1!) / 2 / 100 * innerWidth, // Center of bin
                    y: innerHeight - i * (radius * 2) - radius
                });
            });
        });

    } else if (config.chartType === ChartType.DOTPLOT) {
        const xScale = d3.scaleLinear().domain([0, 100]).range([0, innerWidth]);
        const counts: Record<number, number> = {};
        dataset.forEach(d => {
            const x = xScale(d.valueA);
            const bucket = Math.floor(x / (radius * 2));
            if (!counts[bucket]) counts[bucket] = 0;
            positions.set(d.id, {
                x: bucket * (radius * 2),
                y: innerHeight - counts[bucket] * (radius * 2) - radius
            });
            counts[bucket]++;
        });

    } else if (config.chartType === ChartType.BEESWARM) {
        const xScale = d3.scaleLinear().domain([0, 100]).range([0, innerWidth]);
        
        // Clone nodes to avoid mutating original data during simulation
        const nodes = dataset.map(d => ({ ...d, x: xScale(d.valueA), y: innerHeight / 2 }));
        
        const simulation = d3.forceSimulation(nodes)
            .force("x", d3.forceX((d: any) => xScale(d.valueA)).strength(1))
            .force("y", d3.forceY(innerHeight / 2).strength(0.1))
            .force("collide", d3.forceCollide(radius + 1))
            .stop();

        // Run simulation synchronously
        for (let i = 0; i < 120; ++i) simulation.tick();

        nodes.forEach((d: any) => {
            positions.set(d.id, { x: d.x, y: d.y });
        });

    } else if (config.chartType === ChartType.VIOLIN) {
        // Symmetric Histogram / Sina Plot style
        const xScale = d3.scaleLinear().domain([0, 100]).range([0, innerWidth]);
        const bins = d3.bin<DataPoint, number>()
            .value(d => d.valueA)
            .domain([0, 100])
            .thresholds(xScale.ticks(15))
            (dataset);

        bins.forEach(bin => {
            const binWidth = bin.length * (radius * 1.5); // Approximate width of pile
            bin.forEach((d, i) => {
                const xBase = (bin.x0! + bin.x1!) / 2 / 100 * innerWidth;
                // Alternate left/right from center
                const offset = (i % 2 === 0 ? 1 : -1) * Math.ceil((i + 1) / 2) * (radius * 1.8);
                positions.set(d.id, {
                    x: xBase,
                    y: (innerHeight / 2) + offset
                });
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
    return d3.scaleOrdinal(pointStyle.palette).domain(categories);
  }, [categories, pointStyle.palette]);

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
  
  const getLegendPositionClasses = (pos: LegendPosition) => {
    switch (pos) {
      case LegendPosition.TOP_LEFT: return 'top-8 left-8';
      case LegendPosition.TOP_RIGHT: return 'top-8 right-8';
      case LegendPosition.BOTTOM_RIGHT: return 'bottom-8 right-8';
      case LegendPosition.BOTTOM_LEFT: 
      default: return 'bottom-8 left-8';
    }
  };

  // Tooltip Content Generator
  const generateTooltipHtml = (d: DataPoint) => {
    const fields = pointStyle.tooltipFields;
    // Always render label as title
    let html = `<div class="font-bold text-slate-800 mb-1 pb-1 border-b border-slate-200 text-sm">${d.label}</div>`;
    
    // Body (Key-Value pairs for selected fields)
    if (fields.length > 0) {
        html += `<div class="flex flex-col gap-0.5 mt-1">`;
        fields.forEach(key => {
            let val = d[key];
            if (val === undefined || val === null) return;
            
            // Basic formatting
            if (typeof val === 'number') {
                 val = Number.isInteger(val) ? val : val.toFixed(2);
                 val = `<span class="font-mono font-bold text-slate-700">${val}</span>`;
            } else {
                 val = `<span class="font-medium text-slate-600 text-right max-w-[120px] truncate">${val}</span>`;
            }
            
            const label = key.charAt(0).toUpperCase() + key.slice(1);
            html += `<div class="flex justify-between items-center gap-4 text-xs">
                <span class="text-slate-500">${label}</span>
                ${val}
            </div>`;
        });
        html += `</div>`;
    }
    return html;
  };

  useEffect(() => {
    if (!gRef.current) return;

    // Apply rendering to the inner group 'gRef'
    const svg = d3.select(gRef.current);
    const tooltip = d3.select(tooltipRef.current);
    
    const points = svg.selectAll<SVGPathElement, DataPoint>('path')
      .data(data, d => d.id);

    // Enter Selection: Create new paths
    const enter = points.enter()
      .append('path')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1);

    const symbolGenerator = d3.symbol()
      .type(getD3Symbol(pointStyle.shape))
      .size(pointStyle.radius * pointStyle.radius * Math.PI);

    // Merge Selection: Update new AND existing paths
    // Crucial: Event listeners are attached here so they capture the fresh 'pointStyle' state
    points.merge(enter as any)
      .on('mouseover', (event, d) => {
         const html = generateTooltipHtml(d);
         if (html) {
            tooltip.style('opacity', 1).style('display', 'block').html(html);
         }
      })
      .on('mousemove', (event) => {
        tooltip
          .style('left', (event.clientX + 15) + 'px')
          .style('top', (event.clientY + 15) + 'px');
      })
      .on('mouseout', () => {
        tooltip.style('opacity', 0).style('display', 'none');
      })
      .each(function(d) {
        const start = startPositions.get(d.id) || { x: 0, y: 0 };
        const end = endPositions.get(d.id) || { x: 0, y: 0 };
        
        const ease = d3.easeCubicInOut(progress); 

        const currentX = start.x + (end.x - start.x) * ease;
        const currentY = start.y + (end.y - start.y) * ease;
        
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
          <g transform={`translate(${margin.left},${margin.top})`}>
              <g ref={gRef} />
          </g>
      </svg>

      {/* Legend Overlay */}
      {pointStyle.colorMode === ColorMode.CATEGORY && categories.length > 0 && (
        <div className={`absolute ${getLegendPositionClasses(pointStyle.legendPosition)} bg-white/60 backdrop-blur-xl border border-white/50 p-4 rounded-2xl shadow-xl max-w-[200px] max-h-[300px] overflow-y-auto pointer-events-auto transition-opacity duration-300 hover:opacity-100 opacity-80 no-scrollbar`}>
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

      {/* Tooltip */}
      <div 
        ref={tooltipRef}
        className="fixed z-[100] pointer-events-none bg-white/90 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-xl p-3 min-w-[150px] transition-opacity duration-150 opacity-0 hidden"
      />
    </div>
  );
};
