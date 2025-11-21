import { DataPoint, StoryStep, PointStyle, ChartType, TextPosition, ColorMode } from '../types';

export const downloadProject = (
  data: DataPoint[], 
  steps: StoryStep[], 
  pointStyle: PointStyle
) => {
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MorphFlow Export</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  
  <!-- React & ReactDOM -->
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  
  <!-- Babel for JSX -->
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  
  <!-- D3.js -->
  <script src="https://d3js.org/d3.v7.min.js"></script>

  <style>
    body { font-family: 'Quicksand', sans-serif; }
    /* Smooth scrolling for the container */
    html, body { height: 100%; margin: 0; padding: 0; }
    /* Hide scrollbar for legend */
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  </style>
</head>
<body class="bg-[#fdfcfe] text-slate-800 overflow-hidden">
  <div id="root" class="h-full w-full"></div>

  <script type="text/babel">
    const { useState, useEffect, useRef, useMemo } = React;

    // --- INJECTED DATA ---
    const DATA = ${JSON.stringify(data)};
    const STEPS = ${JSON.stringify(steps)};
    const POINT_STYLE = ${JSON.stringify(pointStyle)};
    
    // --- TYPES & CONSTANTS ---
    const ChartType = {
      GRID: 'GRID',
      SCATTER: 'SCATTER',
      BAR: 'BAR',
      RADIAL: 'RADIAL'
    };

    const TextPosition = {
      CENTER: 'CENTER',
      TOP: 'TOP',
      BOTTOM: 'BOTTOM',
      LEFT: 'LEFT',
      RIGHT: 'RIGHT'
    };

    const ColorMode = {
      CATEGORY: 'CATEGORY',
      SINGLE: 'SINGLE'
    };

    const ShapeType = {
      CIRCLE: 'CIRCLE',
      SQUARE: 'SQUARE',
      DIAMOND: 'DIAMOND',
      TRIANGLE: 'TRIANGLE',
      STAR: 'STAR',
      CROSS: 'CROSS'
    };

    // --- VIZ RENDERER COMPONENT ---
    const VizRenderer = ({ data, prevConfig, nextConfig, pointStyle, progress }) => {
      const svgRef = useRef(null);
      const width = 1000; 
      const height = 800;
      const margin = { top: 60, right: 60, bottom: 60, left: 60 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const calculatePositions = (config, dataset) => {
        const positions = new Map();
        
        if (config.chartType === ChartType.GRID) {
          const cols = 12;
          const cellWidth = innerWidth / cols;
          const cellHeight = innerWidth / cols;
          dataset.forEach((d, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            positions.set(d.id, {
              x: col * cellWidth + cellWidth / 2 + (innerWidth - (cols * cellWidth))/2,
              y: row * cellHeight + cellHeight / 2,
            });
          });
        } else if (config.chartType === ChartType.SCATTER) {
          const xScale = d3.scaleLinear().domain([0, 100]).range([0, innerWidth]);
          const yScale = d3.scaleLinear().domain([0, 100]).range([innerHeight, 0]);
          dataset.forEach(d => {
            positions.set(d.id, { x: xScale(d.valueA), y: yScale(d.valueB) });
          });
        } else if (config.chartType === ChartType.BAR) {
          const categories = Array.from(new Set(dataset.map(d => d.category))).sort();
          const xScale = d3.scaleBand().domain(categories).range([0, innerWidth]).padding(0.4);
          const counts = {};
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
               const r = radius + (d.valueA / 100) * 60; 
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

      const categories = useMemo(() => Array.from(new Set(data.map(d => d.category))).sort(), [data]);
      const colorScale = useMemo(() => {
        // Use the palette directly
        return d3.scaleOrdinal(pointStyle.palette).domain(categories);
      }, [categories, pointStyle.palette]);

      const getD3Symbol = (shape) => {
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
        
        // Use paths instead of circles
        const points = svg.selectAll('path').data(data, d => d.id);
        
        const enter = points.enter()
          .append('path')
          .attr('stroke', '#fff')
          .attr('stroke-width', 1);

        const symbolGenerator = d3.symbol()
          .type(getD3Symbol(pointStyle.shape))
          .size(pointStyle.radius * pointStyle.radius * Math.PI);

        points.merge(enter)
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
              .attr('transform', \`translate(\${currentX},\${currentY})\`)
              .attr('d', symbolGenerator)
              .attr('opacity', pointStyle.opacity)
              .attr('fill', fillColor);
          });
          
        points.exit().remove();
      }, [data, startPositions, endPositions, progress, pointStyle, colorScale]);

      return (
        <div className="w-full h-full flex items-center justify-center p-4 relative">
           <svg ref={svgRef} viewBox={\`0 0 \${width} \${height}\`} className="w-full h-full max-w-6xl max-h-[90vh] drop-shadow-2xl" style={{overflow: 'visible'}}>
              <g transform={\`translate(\${margin.left},\${margin.top})\`} />
           </svg>

           {/* LEGEND */}
           {pointStyle.colorMode === ColorMode.CATEGORY && categories.length > 0 && (
            <div className="absolute bottom-8 left-8 bg-white/60 backdrop-blur-xl border border-white/50 p-4 rounded-2xl shadow-xl max-w-[200px] max-h-[300px] overflow-y-auto pointer-events-auto no-scrollbar">
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

    // --- MAIN EXPORTED APP ---
    const ExportedApp = () => {
      const [activeIndex, setActiveIndex] = useState(0);
      const [localProgress, setLocalProgress] = useState(0);
      const scrollContainerRef = useRef(null);

      useEffect(() => {
        const handleScroll = () => {
          if (!scrollContainerRef.current) return;
          const { scrollTop, clientHeight } = scrollContainerRef.current;
          const totalScrollableHeight = clientHeight * (STEPS.length - 1);
          
          if (totalScrollableHeight <= 0) return;

          const rawProgress = scrollTop / totalScrollableHeight;
          const clampedGlobalProgress = Math.min(Math.max(rawProgress, 0), 1);
          const scaledProgress = clampedGlobalProgress * (STEPS.length - 1);
          const index = Math.floor(scaledProgress);
          const remainder = scaledProgress - index;

          setActiveIndex(Math.min(index, STEPS.length - 2));
          setLocalProgress(index >= STEPS.length - 1 ? 1 : remainder);
        };

        const el = scrollContainerRef.current;
        el?.addEventListener('scroll', handleScroll);
        handleScroll();
        return () => el?.removeEventListener('scroll', handleScroll);
      }, []);

      const prevStep = STEPS[activeIndex];
      const nextStep = STEPS[activeIndex + 1] || STEPS[STEPS.length - 1];
      const prevConfig = { chartType: prevStep.chartType };
      const nextConfig = { chartType: nextStep.chartType };

      const currentText = localProgress < 0.5 ? prevStep : nextStep;
      const textOpacity = Math.min(Math.abs(localProgress - 0.5) * 3, 1);

      const getTextPositionStyles = (pos) => {
        const base = "absolute max-w-md p-8 rounded-3xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-2xl transition-all duration-500";
        switch (pos) {
          case TextPosition.TOP: return \`\${base} top-12 left-1/2 -translate-x-1/2\`;
          case TextPosition.BOTTOM: return \`\${base} bottom-12 left-1/2 -translate-x-1/2\`;
          case TextPosition.LEFT: return \`\${base} left-12 top-1/2 -translate-y-1/2\`;
          case TextPosition.RIGHT: return \`\${base} right-12 top-1/2 -translate-y-1/2\`;
          default: return \`\${base} top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2\`;
        }
      };

      return (
        <div className="h-full w-full overflow-hidden bg-[#fdfcfe] text-slate-800 relative font-sans">
           {/* VIZ LAYER */}
           <div className="absolute inset-0 flex items-center justify-center z-0">
             <VizRenderer 
                data={DATA} 
                prevConfig={prevConfig} 
                nextConfig={nextConfig} 
                pointStyle={POINT_STYLE} 
                progress={localProgress} 
             />
           </div>

           {/* TEXT LAYER */}
           <div className="absolute inset-0 pointer-events-none z-20">
              <div className={getTextPositionStyles(currentText.textPosition)} style={{ opacity: textOpacity }}>
                 <h1 className="text-2xl font-bold mb-2">{currentText.text}</h1>
                 <div className="w-12 h-1 bg-slate-800/20 rounded-full mb-2"></div>
                 <p className="text-sm font-mono uppercase text-slate-500">
                    Scroll to explore
                 </p>
              </div>
           </div>

           {/* SCROLL TRACK */}
           <div ref={scrollContainerRef} className="absolute inset-0 overflow-y-auto z-10 scroll-smooth">
              <div style={{ height: \`\${STEPS.length * 100}vh\`, width: '100%' }}></div>
           </div>
        </div>
      );
    };

    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<ExportedApp />);
  </script>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'morph-flow-viz.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};