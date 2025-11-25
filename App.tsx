
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GlassCard } from './components/GlassCard';
import { VizRenderer } from './components/VizRenderer';
import { downloadProject } from './services/exportService';
import { INITIAL_DATA, CHART_OPTIONS, DEFAULT_POINT_STYLE, DEFAULT_STEPS, POSITION_OPTIONS, COLOR_PALETTES, SHAPE_OPTIONS, LEGEND_POSITION_OPTIONS } from './constants';
import { ChartType, DataPoint, VizConfig, PointStyle, ColorMode, StoryStep, TextPosition, DataMapping, ShapeType, LegendPosition } from './types';
import { Wand2, BarChart3, LayoutGrid, ChevronDown, Upload, FileText, Palette, Database, Plus, Trash2, ArrowUp, ArrowDown, Download, Settings2, Check, Shapes, Maximize2, X, MessageSquare, Code2, Copy, Share2 } from 'lucide-react';

type DataSourceMode = 'UPLOAD' | 'MANUAL';

const App: React.FC = () => {
  // Data & Generation State
  const [data, setData] = useState<DataPoint[]>(INITIAL_DATA);
  const [sourceMode, setSourceMode] = useState<DataSourceMode>('UPLOAD');
  const [manualInput, setManualInput] = useState('');

  // Data Mapping State
  const [rawData, setRawData] = useState<any[]>([]);
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [dataMapping, setDataMapping] = useState<DataMapping>({ category: '', valueA: '', valueB: '', label: '' });
  
  // Config State
  const [steps, setSteps] = useState<StoryStep[]>(DEFAULT_STEPS);
  const [pointStyle, setPointStyle] = useState<PointStyle>(DEFAULT_POINT_STYLE);
  const [activeTab, setActiveTab] = useState<'DATA' | 'STYLE' | 'EXPORT'>('DATA');
  const [isExploreMode, setIsExploreMode] = useState(false);
  const [showEmbedModal, setShowEmbedModal] = useState(false);

  // Scroll Logic
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [localProgress, setLocalProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!scrollContainerRef.current) return;
      const { scrollTop, clientHeight } = scrollContainerRef.current;
      
      const totalScrollableHeight = clientHeight * (steps.length - 1);
      
      if (totalScrollableHeight <= 0) {
          setActiveIndex(0);
          setLocalProgress(0);
          return;
      }

      const rawProgress = scrollTop / totalScrollableHeight;
      const clampedGlobalProgress = Math.min(Math.max(rawProgress, 0), 1);
      
      const scaledProgress = clampedGlobalProgress * (steps.length - 1);
      const index = Math.floor(scaledProgress);
      const remainder = scaledProgress - index;

      setActiveIndex(Math.min(index, steps.length - 2)); 
      setLocalProgress(index >= steps.length - 1 ? 1 : remainder);
    };

    const el = scrollContainerRef.current;
    el?.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => el?.removeEventListener('scroll', handleScroll);
  }, [steps.length]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      
      try {
        let parsedData: any[] = [];
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) parsedData = parsed;
        } else if (file.name.endsWith('.csv')) {
          const lines = text.split('\n').map(l => l.trim()).filter(l => l);
          if (lines.length > 1) {
             const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
             parsedData = lines.slice(1).map(line => {
               const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
               const obj: any = {};
               headers.forEach((h, i) => obj[h] = values[i]);
               return obj;
             });
          }
        }

        if (parsedData.length > 0) {
            setRawData(parsedData);
            const fields = Object.keys(parsedData[0]);
            setAvailableFields(fields);
            
            const newMapping = { ...dataMapping };
            fields.forEach(f => {
                const lower = f.toLowerCase();
                if (lower.includes('cat') || lower.includes('group') || lower.includes('type')) newMapping.category = f;
                else if (lower.includes('val') || lower.includes('x') || lower.includes('size') || lower.includes('num')) {
                     if (!newMapping.valueA) newMapping.valueA = f;
                     else if (!newMapping.valueB) newMapping.valueB = f;
                }
                else if (lower.includes('label') || lower.includes('name') || lower.includes('title')) newMapping.label = f;
            });
            
            if (!newMapping.category && fields[0]) newMapping.category = fields[0];
            if (!newMapping.valueA && fields[1]) newMapping.valueA = fields[1];
            if (!newMapping.valueB && fields[2]) newMapping.valueB = fields[2];
            if (!newMapping.label && fields[0]) newMapping.label = fields[0];

            setDataMapping(newMapping);
        }
      } catch (err) {
        alert('Failed to parse file.');
      }
    };
    reader.readAsText(file);
  };

  const handleApplyMapping = () => {
      if (!rawData.length) return;
      
      const mappedData: DataPoint[] = rawData.map((row, i) => ({
          ...row, // Preserve original fields
          id: `mapped-${i}`,
          category: String(row[dataMapping.category] || 'Uncategorized'),
          // Fallback to valueB if valueA is not mapped/empty, or random if both fail
          valueA: parseFloat(row[dataMapping.valueA]) || parseFloat(row[dataMapping.valueB]) || Math.random() * 100,
          valueB: parseFloat(row[dataMapping.valueB]) || Math.random() * 100,
          label: String(row[dataMapping.label] || `Item ${i}`)
      }));
      
      setData(mappedData);
      // Reset tooltip fields to empty (show label only by default)
      setPointStyle(prev => ({...prev, tooltipFields: []}));
  };

  const handleManualSubmit = () => {
    try {
      const parsed = JSON.parse(manualInput);
      if (Array.isArray(parsed)) {
        setData(parsed as DataPoint[]);
        setRawData([]);
        setPointStyle(prev => ({...prev, tooltipFields: []}));
      } else {
        alert('Input must be a JSON array.');
      }
    } catch (err) {
      alert('Invalid JSON format.');
    }
  };

  // Step Management
  const addStep = () => {
    const newStep: StoryStep = {
      id: `step-${Date.now()}`,
      chartType: ChartType.GRID,
      text: 'New Stage',
      textPosition: TextPosition.CENTER
    };
    setSteps([...steps, newStep]);
  };

  const updateStep = (index: number, updates: Partial<StoryStep>) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], ...updates };
    setSteps(newSteps);
  };

  const removeStep = (index: number) => {
    if (steps.length <= 2) return;
    const newSteps = steps.filter((_, i) => i !== index);
    setSteps(newSteps);
  };
  
  const toggleTooltipField = (key: string) => {
    setPointStyle(prev => {
      const current = prev.tooltipFields;
      if (current.includes(key)) {
        return { ...prev, tooltipFields: current.filter(k => k !== key) };
      } else {
        return { ...prev, tooltipFields: [...current, key] };
      }
    });
  };

  const tooltipOptions = useMemo(() => {
    if (data.length === 0) return [];
    const keys = Object.keys(data[0]);
    // Exclude internal/d3 props AND standard mapped fields (label, category, values)
    const excluded = ['id', 'x', 'y', 'vx', 'vy', 'index', 'valueA', 'valueB', 'label', 'category', 'color']; 
    return keys.filter(k => !excluded.includes(k));
  }, [data]);
  
  // Derived Configs
  const prevStep = steps[activeIndex];
  const nextStep = steps[activeIndex + 1] || steps[steps.length - 1];

  const prevConfig: VizConfig = { chartType: prevStep.chartType, xKey: 'valueA', yKey: 'valueB' };
  const nextConfig: VizConfig = { chartType: nextStep.chartType, xKey: 'valueA', yKey: 'valueB' };

  const currentText = localProgress < 0.5 ? prevStep : nextStep;
  const textOpacity = Math.min(Math.abs(localProgress - 0.5) * 3, 1); 
  
  const getTextPositionStyles = (pos: TextPosition) => {
    const base = "absolute max-w-sm p-6 rounded-[2rem] bg-white/60 backdrop-blur-md border border-white/50 shadow-xl transition-all duration-500";
    switch (pos) {
      case TextPosition.TOP: return `${base} top-10 left-1/2 -translate-x-1/2`;
      case TextPosition.BOTTOM: return `${base} bottom-10 left-1/2 -translate-x-1/2`;
      case TextPosition.LEFT: return `${base} left-10 top-1/2 -translate-y-1/2`;
      case TextPosition.RIGHT: return `${base} right-10 top-1/2 -translate-y-1/2`;
      default: return `${base} top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`; 
    }
  };

  const BUTTON_GRADIENT = 'bg-gradient-to-r from-[#FF8F8F] to-[#FFF1CB] text-slate-800 hover:shadow-lg active:scale-95';

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#fdfcfe] text-slate-800 flex font-sans">
      
      {/* LEFT PANEL */}
      <aside className="w-[420px] h-full flex flex-col gap-4 shadow-2xl bg-gradient-to-b from-[#E6E2F9] to-[#DDEAFB] backdrop-blur-xl border-r border-white/60 p-4 z-30">
        <header className="px-2 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-700 to-slate-500 mb-1">
                MorphFlow
            </h1>
            <p className="text-xs text-slate-600 font-medium opacity-70">Interactive Data Storytelling</p>
          </div>
        </header>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-white/30 rounded-2xl mx-1 shrink-0">
          <button 
            onClick={() => setActiveTab('DATA')}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'DATA' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-600 hover:bg-white/20'}`}
          >
            <Database className="w-4 h-4 inline mr-2" />
            Story
          </button>
          <button 
            onClick={() => setActiveTab('STYLE')}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'STYLE' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-600 hover:bg-white/20'}`}
          >
            <Palette className="w-4 h-4 inline mr-2" />
            Visuals
          </button>
          <button 
            onClick={() => setActiveTab('EXPORT')}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'EXPORT' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-600 hover:bg-white/20'}`}
          >
            <Share2 className="w-4 h-4 inline mr-2" />
            Export
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 px-1 pb-4">
          {activeTab === 'DATA' && (
            <>
              <GlassCard className="flex flex-col gap-3 !p-4">
                 <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                   <Database className="w-3 h-3" /> Data Source
                 </h2>
                <div className="flex gap-2 mb-2">
                  {(['UPLOAD', 'MANUAL'] as DataSourceMode[]).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setSourceMode(mode)}
                      className={`flex-1 py-1.5 text-[10px] font-bold rounded-xl border ${
                        sourceMode === mode 
                        ? 'bg-[#C2E2FA] border-[#B7A3E3] text-slate-700' 
                        : 'bg-transparent border-slate-300/50 text-slate-500 hover:bg-white/30'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
                
                {sourceMode === 'UPLOAD' && (
                   <div className="space-y-3">
                       <div className="relative border-2 border-dashed border-slate-300 rounded-2xl p-4 text-center hover:bg-white/20 transition-colors group">
                          <input 
                            type="file" 
                            accept=".json,.csv"
                            onChange={handleFileUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <div className="flex flex-col items-center gap-1">
                            <Upload className="w-4 h-4 text-slate-400" />
                            <p className="text-xs text-slate-500 group-hover:text-slate-700">
                              {rawData.length > 0 ? `File loaded (${rawData.length} rows)` : 'Upload CSV or JSON'}
                            </p>
                          </div>
                        </div>

                        {rawData.length > 0 && (
                            <div className="bg-white/30 rounded-2xl p-3 space-y-3 animate-in fade-in slide-in-from-top-2 border border-white/40">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                    <Settings2 className="w-3 h-3" />
                                    <span>Map Your Data</span>
                                </div>
                                <div className="space-y-2">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Grouping Category</label>
                                        <div className="relative">
                                            <select 
                                                value={dataMapping.category}
                                                onChange={e => setDataMapping({...dataMapping, category: e.target.value})}
                                                className="w-full appearance-none bg-white/50 border border-white/50 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-200 cursor-pointer"
                                            >
                                                {availableFields.map(f => <option key={f} value={f}>{f}</option>)}
                                            </select>
                                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Value / Height</label>
                                        <div className="relative">
                                            <select 
                                                value={dataMapping.valueB}
                                                onChange={e => setDataMapping({...dataMapping, valueB: e.target.value})}
                                                className="w-full appearance-none bg-white/50 border border-white/50 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-200 cursor-pointer"
                                            >
                                                {availableFields.map(f => <option key={f} value={f}>{f}</option>)}
                                            </select>
                                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Label</label>
                                        <div className="relative">
                                            <select 
                                                value={dataMapping.label}
                                                onChange={e => setDataMapping({...dataMapping, label: e.target.value})}
                                                className="w-full appearance-none bg-white/50 border border-white/50 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-200 cursor-pointer"
                                            >
                                                {availableFields.map(f => <option key={f} value={f}>{f}</option>)}
                                            </select>
                                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>
                                <button onClick={handleApplyMapping} className={`w-full py-2 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${BUTTON_GRADIENT}`}>
                                    <Check className="w-3 h-3" /> Update Visualization
                                </button>
                            </div>
                        )}
                   </div>
                )}
                
                 {sourceMode === 'MANUAL' && (
                    <div className="space-y-2">
                      <textarea
                        className="w-full h-20 bg-white/50 border border-white/50 rounded-2xl px-4 py-2 text-[10px] font-mono focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
                        placeholder='[{"id":"1", ...}]'
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                      />
                      <button onClick={handleManualSubmit} className={`w-full py-2 rounded-2xl font-bold text-xs transition-all ${BUTTON_GRADIENT}`}>
                        Update Data
                      </button>
                    </div>
                  )}
              </GlassCard>

              <div className="space-y-3">
                 <div className="flex items-center justify-between px-2">
                    <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                      <LayoutGrid className="w-3 h-3" /> Story Sequence
                    </h2>
                 </div>
                 <div className="space-y-3">
                   {steps.map((step, idx) => (
                     <GlassCard key={step.id} className="!p-3 relative group">
                       <div className="flex items-center justify-between mb-3">
                         <span className="text-[10px] font-bold text-slate-400 bg-white/50 px-2 py-0.5 rounded-full border border-white/50">Step {idx + 1}</span>
                         <button onClick={() => removeStep(idx)} disabled={steps.length <= 2} className="text-slate-400 hover:text-red-400 disabled:opacity-20 transition-colors">
                           <Trash2 className="w-4 h-4" />
                         </button>
                       </div>
                       <div className="space-y-2">
                         <div className="flex gap-2">
                           <div className="relative flex-1">
                             <select
                               value={step.chartType}
                               onChange={(e) => updateStep(idx, { chartType: e.target.value as ChartType })}
                               className="w-full appearance-none bg-white/50 border border-white/50 rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-200 cursor-pointer"
                             >
                               {CHART_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                             </select>
                             <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                           </div>
                         </div>
                         <textarea 
                            value={step.text}
                            onChange={(e) => updateStep(idx, { text: e.target.value })}
                            className="w-full bg-white/30 border border-white/40 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-200 resize-none"
                            rows={2}
                         />
                         <div className="relative">
                           <select
                              value={step.textPosition}
                              onChange={(e) => updateStep(idx, { textPosition: e.target.value as TextPosition })}
                              className="w-full appearance-none bg-white/50 border border-white/50 rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-200 cursor-pointer"
                           >
                             {POSITION_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>Text: {opt.label}</option>)}
                           </select>
                           <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                         </div>
                       </div>
                       {idx < steps.length - 1 && <div className="absolute left-1/2 -bottom-4 w-0.5 h-4 bg-slate-400/30 -translate-x-1/2 z-0" />}
                     </GlassCard>
                   ))}
                 </div>
                 <button onClick={addStep} className="w-full py-2 rounded-2xl border-2 border-dashed border-slate-300 text-slate-500 hover:bg-white/20 hover:border-slate-400 hover:text-slate-700 transition-all flex items-center justify-center gap-2 text-xs font-bold uppercase">
                   <Plus className="w-4 h-4" /> Add Step
                 </button>
              </div>
            </>
          )}
          
          {activeTab === 'STYLE' && (
            <>
              <GlassCard className="flex flex-col gap-4 !p-4">
                <div className="flex items-center gap-2 text-slate-700 font-semibold">
                  <Palette className="w-4 h-4" /> <h2>Visual Style</h2>
                </div>
                
                 {/* Tooltip Customization */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> Tooltip Details
                    </label>
                    <div className="bg-white/30 rounded-2xl p-2 border border-white/40">
                       <p className="text-[10px] text-slate-500 mb-2">Select fields to show (Label is always included):</p>
                       <div className="flex flex-wrap gap-2">
                           {tooltipOptions.length === 0 && <span className="text-[10px] text-slate-400 italic">No extra fields available</span>}
                           {tooltipOptions.map(key => (
                               <button 
                                   key={key}
                                   onClick={() => toggleTooltipField(key)}
                                   className={`px-3 py-1.5 text-[10px] rounded-xl border transition-all ${
                                       pointStyle.tooltipFields.includes(key)
                                       ? 'bg-[#C2E2FA] border-[#B7A3E3] text-slate-800 font-bold shadow-sm'
                                       : 'bg-white/40 border-slate-200 text-slate-500 hover:bg-white/60'
                                   }`}
                               >
                                   {key}
                               </button>
                           ))}
                       </div>
                    </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><Shapes className="w-3 h-3" /> Point Shape</label>
                  <div className="grid grid-cols-3 gap-2">
                    {SHAPE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setPointStyle({...pointStyle, shape: opt.value})}
                        className={`py-2 text-[10px] rounded-xl border transition-all flex items-center justify-center gap-1 ${
                          pointStyle.shape === opt.value ? 'bg-[#C2E2FA] border-[#B7A3E3] text-slate-800 font-bold shadow-sm' : 'border-transparent bg-white/30 text-slate-500 hover:bg-white/50'
                        }`}
                      >
                         {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium text-slate-600"><span>Point Size</span><span>{pointStyle.radius}px</span></div>
                  <input type="range" min="2" max="30" value={pointStyle.radius} onChange={(e) => setPointStyle({...pointStyle, radius: Number(e.target.value)})} className="w-full h-2 bg-slate-200/50 rounded-full appearance-none cursor-pointer accent-[#FF8F8F]" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium text-slate-600"><span>Opacity</span><span>{Math.round(pointStyle.opacity * 100)}%</span></div>
                  <input type="range" min="0.1" max="1" step="0.1" value={pointStyle.opacity} onChange={(e) => setPointStyle({...pointStyle, opacity: Number(e.target.value)})} className="w-full h-2 bg-slate-200/50 rounded-full appearance-none cursor-pointer accent-[#FF8F8F]" />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Color Strategy</label>
                  <div className="flex gap-2">
                    <button onClick={() => setPointStyle({...pointStyle, colorMode: ColorMode.CATEGORY})} className={`flex-1 py-2 text-xs rounded-xl border transition-all ${pointStyle.colorMode === ColorMode.CATEGORY ? 'bg-[#C2E2FA] border-[#B7A3E3] text-slate-800 font-bold' : 'border-transparent bg-white/20 text-slate-500'}`}>By Category</button>
                    <button onClick={() => setPointStyle({...pointStyle, colorMode: ColorMode.SINGLE})} className={`flex-1 py-2 text-xs rounded-xl border transition-all ${pointStyle.colorMode === ColorMode.SINGLE ? 'bg-[#C2E2FA] border-[#B7A3E3] text-slate-800 font-bold' : 'border-transparent bg-white/20 text-slate-500'}`}>Single Color</button>
                  </div>
                </div>

                {pointStyle.colorMode === ColorMode.CATEGORY && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                     <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Color Palette</label>
                     <div className="space-y-2 max-h-[200px] overflow-y-auto no-scrollbar">
                        {Object.entries(COLOR_PALETTES).map(([name, colors]) => (
                          <button
                             key={name}
                             onClick={() => setPointStyle({...pointStyle, palette: colors})}
                             className={`w-full p-2 rounded-2xl border transition-all flex items-center justify-between group ${JSON.stringify(pointStyle.palette) === JSON.stringify(colors) ? 'bg-white/60 border-[#B7A3E3] shadow-sm ring-1 ring-[#B7A3E3]/50' : 'bg-white/30 border-transparent hover:bg-white/50'}`}
                          >
                             <span className="text-[10px] font-bold text-slate-500">{name}</span>
                             <div className="flex gap-1">
                                {colors.slice(0, 6).map((c, i) => <div key={i} className="w-3 h-3 rounded-full" style={{backgroundColor: c}} />)}
                             </div>
                          </button>
                        ))}
                     </div>
                  </div>
                )}

                {pointStyle.colorMode === ColorMode.SINGLE && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Base Color</label>
                    <div className="flex gap-2 flex-wrap">
                      {['#FF8F8F', '#FFF1CB', '#C2E2FA', '#B7A3E3', '#334155', '#F472B6', '#FDBA74', '#86EFAC'].map(c => (
                        <button key={c} onClick={() => setPointStyle({...pointStyle, baseColor: c})} className={`w-8 h-8 rounded-full border-2 shadow-sm ${pointStyle.baseColor === c ? 'border-slate-600 scale-110' : 'border-white'}`} style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Legend Position Selector */}
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">Legend Position</label>
                   <div className="grid grid-cols-2 gap-2">
                     {LEGEND_POSITION_OPTIONS.map(opt => (
                       <button 
                         key={opt.value}
                         onClick={() => setPointStyle({...pointStyle, legendPosition: opt.value})}
                         className={`py-2 text-[10px] rounded-xl border transition-all flex items-center justify-center gap-1 ${
                           pointStyle.legendPosition === opt.value ? 'bg-[#C2E2FA] border-[#B7A3E3] text-slate-800 font-bold shadow-sm' : 'border-transparent bg-white/30 text-slate-500 hover:bg-white/50'
                         }`}
                       >
                         {opt.label}
                       </button>
                     ))}
                   </div>
                </div>
              </GlassCard>
            </>
          )}

          {activeTab === 'EXPORT' && (
             <GlassCard className="!p-4">
                 <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2 mb-3">
                   <Share2 className="w-3 h-3" /> Export & Share
                 </h2>
                 <div className="grid grid-cols-2 gap-2">
                    <button 
                        onClick={() => downloadProject(data, steps, pointStyle)}
                        className="py-4 rounded-2xl bg-white/40 hover:bg-white/60 hover:shadow-md border border-white/40 transition-all flex flex-col items-center justify-center gap-2"
                    >
                        <Download className="w-6 h-6 text-slate-700" />
                        <span className="text-xs font-bold text-slate-600">Download HTML</span>
                    </button>
                    <button 
                        onClick={() => setShowEmbedModal(true)}
                        className="py-4 rounded-2xl bg-white/40 hover:bg-white/60 hover:shadow-md border border-white/40 transition-all flex flex-col items-center justify-center gap-2"
                    >
                        <Code2 className="w-6 h-6 text-slate-700" />
                        <span className="text-xs font-bold text-slate-600">Get Embed Code</span>
                    </button>
                 </div>
                 <div className="mt-4 p-3 bg-white/30 rounded-xl border border-white/40">
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                        <strong>Exporting</strong> creates a standalone HTML file that works offline. 
                        <strong>Embed Code</strong> gives you an iframe to place this visualization on your own website.
                    </p>
                 </div>
             </GlassCard>
          )}

        </div>
      </aside>

      {/* RIGHT PANEL: Visualizer & Story */}
      <main className="flex-1 relative h-full overflow-hidden bg-[#fdfcfe]">
        
        {/* Explore Toggle */}
        <div className="absolute top-4 right-8 z-50">
            <button 
               onClick={() => setIsExploreMode(!isExploreMode)}
               className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold shadow-lg transition-all ${
                   isExploreMode 
                   ? 'bg-slate-800 text-white hover:bg-slate-700' 
                   : 'bg-white/80 text-slate-700 hover:bg-white border border-slate-200'
               }`}
            >
               {isExploreMode ? (
                   <>
                       <X className="w-4 h-4" />
                       Exit Exploration
                   </>
               ) : (
                   <>
                      <Maximize2 className="w-4 h-4" />
                      Explore Data
                   </>
               )}
            </button>
        </div>

        {/* Fixed Visualization Layer */}
        {/* When in Explore Mode, we bump Z-index to sit above the scroll track and text, and enable pointer events */}
        <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${isExploreMode ? 'z-40 pointer-events-auto bg-[#fdfcfe]/95' : 'z-0 pointer-events-none'}`}>
           <VizRenderer 
             data={data} 
             prevConfig={prevConfig} 
             nextConfig={nextConfig} 
             pointStyle={pointStyle}
             progress={localProgress} 
           />
        </div>

        {/* Text Overlay Layer */}
        <div className={`absolute inset-0 pointer-events-none z-20 overflow-hidden transition-opacity duration-300 ${isExploreMode ? 'opacity-0' : 'opacity-100'}`}>
           <div className={getTextPositionStyles(currentText.textPosition)} style={{ opacity: textOpacity }}>
             <h2 className="text-lg font-bold text-slate-800 mb-1">{currentText.text}</h2>
             <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wide">Step {activeIndex + (localProgress > 0.5 ? 1 : 0) + 1} of {steps.length}</p>
           </div>
        </div>

        {/* Invisible Scroll Track */}
        <div 
            ref={scrollContainerRef}
            className="absolute inset-0 overflow-y-auto overflow-x-hidden z-10 scroll-smooth"
            style={{ pointerEvents: isExploreMode ? 'none' : 'auto' }} 
        >
            <div style={{ height: `${steps.length * 100}vh`, width: '100%' }} className="relative" />
        </div>
        
        {/* Scroll Indicators */}
        {!isExploreMode && (
          <div className="absolute bottom-8 right-8 flex flex-col gap-2 z-30">
             <div className="bg-white/30 backdrop-blur p-2 rounded-full text-slate-600 border border-white/40 shadow-lg">
                <span className="text-xs font-bold block text-center">{Math.round((activeIndex + localProgress) / (steps.length - 1) * 100)}%</span>
             </div>
          </div>
        )}

      </main>

      {/* EMBED MODAL */}
      {showEmbedModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4">
            <GlassCard className="w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-700">Embed Visualization</h3>
                    <button onClick={() => setShowEmbedModal(false)} className="p-1 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
                </div>
                <div className="space-y-4">
                    <div className="text-sm text-slate-600 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                        <p className="mb-2"><strong>How to embed:</strong></p>
                        <ol className="list-decimal pl-4 space-y-1">
                            <li>Download the HTML file using the "Download HTML" button.</li>
                            <li>Upload the file to your website or hosting provider.</li>
                            <li>Copy the code below and paste it where you want the chart to appear.</li>
                        </ol>
                    </div>
                    
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Embed Code</label>
                        <div className="relative group">
                            <textarea 
                                readOnly
                                className="w-full h-24 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono text-slate-600 resize-none focus:outline-none focus:ring-2 focus:ring-blue-200"
                                value={`<iframe src="YOUR_UPLOADED_FILE_URL.html" width="100%" height="800" frameborder="0" style="border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);"></iframe>`}
                            />
                             <button 
                                onClick={() => {
                                    navigator.clipboard.writeText(`<iframe src="YOUR_UPLOADED_FILE_URL.html" width="100%" height="800" frameborder="0" style="border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);"></iframe>`);
                                    alert('Copied to clipboard!');
                                }}
                                className="absolute top-2 right-2 p-1.5 bg-white shadow-sm border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500"
                                title="Copy to clipboard"
                            >
                                <Copy className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                    
                    <button onClick={() => setShowEmbedModal(false)} className="w-full py-2.5 bg-slate-800 text-white rounded-xl font-bold text-sm hover:bg-slate-700 transition-all shadow-lg hover:shadow-xl">
                        Done
                    </button>
                </div>
            </GlassCard>
        </div>
      )}
    </div>
  );
};

export default App;
