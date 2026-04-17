import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Mail, 
  PhoneCall, 
  Database, 
  FileSpreadsheet,
  Building2,
  Trash2,
  Settings,
  PlusCircle,
  Menu,
  Download,
  Filter,
  Calendar,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Upload,
  AlertCircle,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  Legend
} from 'recharts';
import { format, parseISO, startOfWeek, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { ProductivityRecord, View, Assistant, Area, Indicator, UserRole } from './types.ts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);
    return (
      <div className="bg-white p-3 border border-up-border shadow-xl min-w-[180px]">
        <p className="text-[10px] uppercase font-bold text-up-navy mb-2 border-b border-up-border pb-1 tracking-[0.2em]">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex justify-between items-center gap-6">
              <span className="text-[9px] uppercase font-bold text-gray-500 flex items-center gap-1.5 whitespace-nowrap">
                 <div style={{ backgroundColor: entry.color || entry.payload?.fill || entry.payload?.color }} className="w-1.5 h-1.5 rounded-full" />
                 {entry.name}
              </span>
              <span className="text-[10px] font-bold text-up-navy tabular-nums">
                {entry.value} 
                <span className="text-gray-300 font-normal ml-1 text-[8px]">
                  ({total > 0 ? ((entry.value / total) * 100).toFixed(1) : 0}%)
                </span>
              </span>
            </div>
          ))}
          {payload.length > 1 && (
             <div className="flex justify-between items-center gap-6 pt-1.5 border-t border-dashed border-gray-100 mt-1">
               <span className="text-[9px] uppercase font-bold text-up-gold">Total General</span>
               <span className="text-[10px] font-bold text-up-gold tabular-nums">{total}</span>
             </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

const Header = () => (
  <header className="p-8 border-b-2 border-up-navy bg-white flex justify-between items-end">
    <div className="flex items-center gap-6">
      <img 
        src="https://upload.wikimedia.org/wikipedia/commons/e/e0/UPacifico.png" 
        alt="UP Logo" 
        className="h-12 w-auto" 
        referrerPolicy="no-referrer"
      />
      <div className="border-l border-up-border pl-6">
        <h1 className="text-3xl font-bold leading-none text-up-navy uppercase tracking-tighter">Atención al Usuario</h1>
        <p className="text-[10px] uppercase tracking-[0.2em] mt-1 text-up-gold font-bold">DAAR - Dirección de Asuntos Académicos y Registro</p>
      </div>
    </div>
    <div className="text-right font-serif italic text-gray-400 text-sm">
      {format(new Date(), "eeee, d 'de' MMMM, yyyy", { locale: es })}
    </div>
  </header>
);

const Footer = () => (
  <footer className="bg-up-navy text-white px-8 py-2 text-[9px] flex justify-between items-center">
    <span className="opacity-50 tracking-widest uppercase">Sistema de Registro de Productvidad • v5.0</span>
    <span className="uppercase tracking-widest font-bold opacity-80">Dirección de Asuntos Académicos y Registro - Universidad del Pacífico</span>
  </footer>
);

const Dashboard = ({ records, assistants, areas, indicators }: { records: ProductivityRecord[], assistants: Assistant[], areas: Area[], indicators: Indicator[] }) => {
  const [filter, setFilter] = useState<'semana' | 'mes' | 'año' | 'total' | 'personalizado'>('semana');
  const [dashboardMode, setDashboardMode] = useState<'canal' | 'colaborador' | 'grupal'>('canal');
  const [dateRange, setDateRange] = useState({ 
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'), 
    end: format(new Date(), 'yyyy-MM-dd') 
  });
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  
  const [selectedChannels, setSelectedChannels] = useState<string[]>(indicators.map(c => c.key));
  const [selectedAssistants, setSelectedAssistants] = useState<string[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Staged filters for advanced mode
  const [stagedChannels, setStagedChannels] = useState<string[]>(selectedChannels);
  const [stagedAssistants, setStagedAssistants] = useState<string[]>(selectedAssistants);

  // Sync staged filters when panel opens
  useEffect(() => {
    if (showAdvancedFilters) {
      setStagedChannels(selectedChannels);
      setStagedAssistants(selectedAssistants);
    }
  }, [showAdvancedFilters]);

  // Sync selected assistants when area changes or assistants load
  useEffect(() => {
    const relevantAssistants = assistants.filter(a => {
      if (selectedArea === 'all') return true;
      if (selectedArea === 'idiomas-all') return a.areaId === 'idiomas-si' || a.areaId === 'idiomas-mf';
      return a.areaId === selectedArea;
    });
    const assistantsIds = relevantAssistants.map(a => a.id);
    setSelectedAssistants(assistantsIds);
    setStagedAssistants(assistantsIds);
  }, [selectedArea, assistants]);

  const availableYears = Array.from(new Set([
    new Date().getFullYear().toString(),
    ...records.map(r => r.date.split('-')[0])
  ])).sort((a,b) => b.localeCompare(a));

  const toggleCSAT = () => {
    const csatKeys = indicators.filter(i => i.group === 'CSAT').map(i => i.key);
    const hasAll = csatKeys.every(k => stagedChannels.includes(k));
    if (hasAll) {
      setStagedChannels(prev => prev.filter(k => !csatKeys.includes(k)));
    } else {
      setStagedChannels(prev => Array.from(new Set([...prev, ...csatKeys])));
    }
  };

  const isCSATActive = indicators.filter(i => i.group === 'CSAT').every(i => stagedChannels.includes(i.key));
  const hasSomeCSAT = indicators.filter(i => i.group === 'CSAT').some(i => stagedChannels.includes(i.key));

  const filteredRecords = records.filter(r => {
    const date = parseISO(r.date);
    let areaMatch = false;
    
    if (selectedArea === 'all') {
      areaMatch = true;
    } else if (selectedArea === 'idiomas-all') {
      areaMatch = r.areaId === 'idiomas-si' || r.areaId === 'idiomas-mf';
    } else {
      areaMatch = r.areaId === selectedArea;
    }

    const assistantMatch = selectedAssistants.includes(r.assistantId);

    let dateMatch = true;
    if (filter === 'semana') {
      dateMatch = date >= startOfWeek(new Date(), { weekStartsOn: 1 });
    } else if (filter === 'mes') {
      dateMatch = date >= startOfMonth(new Date());
    } else if (filter === 'año') {
      dateMatch = r.date.startsWith(selectedYear);
    } else if (filter === 'personalizado') {
      const start = parseISO(dateRange.start);
      const end = parseISO(dateRange.end);
      dateMatch = date >= start && date <= end;
    }
    return areaMatch && dateMatch && assistantMatch;
  });

  const exportToCSV = () => {
    const headers = ["Fecha", "Colaborador", "Area", ...selectedChannels.map(k => indicators.find(c => c.key === k)?.label || k), "Total"];
    const rows = filteredRecords.map(r => {
      const asis = assistants.find(a => a.id === r.assistantId);
      const area = areas.find(a => a.id === r.areaId);
      const channelValues = selectedChannels.map(k => (r as any)[k] || 0);
      const total = channelValues.reduce((a, b) => a + b, 0);
      return [
        r.date,
        asis?.name || 'N/A',
        area?.name || 'N/A',
        ...channelValues,
        total
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `reporte_productividad_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalStats: any = {};
  indicators.forEach(idx => {
    totalStats[idx.key] = selectedChannels.includes(idx.key) ? filteredRecords.reduce((acc, r) => acc + (r[idx.key] || 0), 0) : 0;
  });

  const aggregateData = () => {
    if (dashboardMode === 'colaborador') {
      const activeAssistants = assistants.filter(a => selectedAssistants.includes(a.id));
      return activeAssistants.map(assistant => {
        const assistantRecords = filteredRecords.filter(r => r.assistantId === assistant.id);
        const data: any = { name: assistant.name };
        indicators.forEach(indic => {
          data[indic.key] = selectedChannels.includes(indic.key) ? assistantRecords.reduce((acc, curr) => acc + (curr[indic.key] || 0), 0) : 0;
        });
        return data;
      }).filter(d => indicators.some(i => d[i.key] > 0));
    } else if (dashboardMode === 'grupal') {
      if (selectedArea === 'all' || selectedArea === 'idiomas-all') {
        const targetAreas = selectedArea === 'all' ? areas : areas.filter(a => a.id === 'idiomas-si' || a.id === 'idiomas-mf');
        return targetAreas.map(area => {
          const areaRecords = filteredRecords.filter(r => r.areaId === area.id);
          const data: any = { name: area.name };
          indicators.forEach(indic => {
            data[indic.key] = selectedChannels.includes(indic.key) ? areaRecords.reduce((acc, curr) => acc + (curr[indic.key] || 0), 0) : 0;
          });
          return data;
        }).filter(d => indicators.some(i => d[i.key] > 0));
      } else {
        const uniqueDates = Array.from(new Set(filteredRecords.map(r => r.date))).sort();
        return uniqueDates.map(d => {
          const dateRecords = filteredRecords.filter(r => r.date === d);
          const data: any = { name: format(parseISO(d), 'dd/MM') };
          indicators.forEach(indic => {
            data[indic.key] = selectedChannels.includes(indic.key) ? dateRecords.reduce((acc, curr) => acc + (curr[indic.key] || 0), 0) : 0;
          });
          return data;
        });
      }
    } else {
      const colors = ['#003366', '#c5a059', '#1a1a1a', '#666666', '#22c55e', '#eab308', '#ef4444', '#a855f7', '#ec4899'];
      return indicators.map((indic, i) => ({
        name: indic.label,
        value: totalStats[indic.key],
        color: colors[i % colors.length]
      })).filter(d => d.value > 0);
    }
  };

  const chartData = aggregateData();

  const toggleStagedChannel = (key: string) => {
    setStagedChannels(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const toggleStagedAssistant = (id: string) => {
    setStagedAssistants(prev => prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id]);
  };

  const applyAdvancedFilters = () => {
    setSelectedChannels(stagedChannels);
    setSelectedAssistants(stagedAssistants);
    setShowAdvancedFilters(false);
  };

  const relevantAssistantsForCurrentArea = assistants.filter(a => {
    if (selectedArea === 'all') return true;
    if (selectedArea === 'idiomas-all') return a.areaId === 'idiomas-si' || a.areaId === 'idiomas-mf';
    return a.areaId === selectedArea;
  });

  const resetFilters = () => {
    const allC = indicators.map(c => c.key);
    const allA = relevantAssistantsForCurrentArea.map(a => a.id);
    setFilter('semana');
    setSelectedArea('all');
    setSelectedChannels(allC);
    setSelectedAssistants(allA);
    setStagedChannels(allC);
    setStagedAssistants(allA);
    setSelectedYear(new Date().getFullYear().toString());
    setDateRange({ 
      start: format(startOfMonth(new Date()), 'yyyy-MM-dd'), 
      end: format(new Date(), 'yyyy-MM-dd') 
    });
    setShowAdvancedFilters(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
      <div className="flex flex-col gap-6 border-b border-up-border pb-6">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-4 mb-1">
              <h2 className="pane-title mb-0 border-none pb-0">Dashboard de Gestión</h2>
              <button 
                onClick={exportToCSV}
                className="flex items-center gap-1.5 px-3 py-1 bg-up-bg border border-up-border text-[9px] uppercase font-bold text-up-navy hover:bg-up-navy hover:text-white transition-all shadow-sm"
                title="Exportar estos datos a CSV"
              >
                <Download size={10} /> Exportar Reporte
              </button>
              <button 
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 border text-[9px] uppercase font-bold transition-all shadow-sm",
                  showAdvancedFilters ? "bg-up-gold text-white border-up-gold" : "bg-white border-up-border text-gray-500 hover:border-up-gold"
                )}
              >
                <Settings size={10} /> Filtros Avanzados
              </button>
              <button 
                onClick={resetFilters}
                className="flex items-center gap-1.5 px-3 py-1 bg-white border border-up-border text-[9px] uppercase font-bold text-red-500 hover:bg-red-50 hover:border-red-200 transition-all shadow-sm"
                title="Restablecer todos los filtros"
              >
                <Trash2 size={10} /> Limpiar Filtros
              </button>
            </div>
            <select 
              value={selectedArea} 
              onChange={(e) => setSelectedArea(e.target.value)}
              className="font-serif italic text-up-gold bg-transparent focus:outline-none text-lg cursor-pointer"
            >
              <option value="all">Elegir Área (Todas)</option>
              <option value="idiomas-all">Centro de Idiomas (Ambas Sedes)</option>
              {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col items-end gap-3">
             <div className="flex bg-up-bg p-1 border border-up-border shadow-sm">
                <button 
                  onClick={() => setDashboardMode('grupal')}
                  className={cn(
                    "px-4 py-1.5 text-[9px] uppercase font-bold tracking-widest transition-all",
                    dashboardMode === 'grupal' ? "bg-up-navy text-white shadow-inner" : "text-gray-400 hover:text-up-navy"
                  )}
                >
                  Vista Grupal
                </button>
                <button 
                  onClick={() => setDashboardMode('canal')}
                  className={cn(
                    "px-4 py-1.5 text-[9px] uppercase font-bold tracking-widest transition-all",
                    dashboardMode === 'canal' ? "bg-up-navy text-white shadow-inner" : "text-gray-400 hover:text-up-navy"
                  )}
                >
                  Vista por Indicador
                </button>
                <button 
                  onClick={() => setDashboardMode('colaborador')}
                  className={cn(
                    "px-4 py-1.5 text-[9px] uppercase font-bold tracking-widest transition-all",
                    dashboardMode === 'colaborador' ? "bg-up-navy text-white shadow-inner" : "text-gray-400 hover:text-up-navy"
                  )}
                >
                  Vista Colaborador
                </button>
             </div>
             <div className="flex gap-4">
               {['semana', 'mes', 'año', 'personalizado', 'total'].map(f => (
                 <button key={f} onClick={() => setFilter(f as any)} className={cn("text-[10px] uppercase font-bold tracking-widest transition-all", filter === f ? "text-up-navy underline underline-offset-4" : "text-gray-300 hover:text-up-navy")}>
                   {f === 'personalizado' ? 'Calendario' : f === 'año' ? 'Anual' : f}
                 </button>
               ))}
             </div>
          </div>
        </div>

        <AnimatePresence>
          {showAdvancedFilters && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }} 
              animate={{ height: 'auto', opacity: 1 }} 
              exit={{ height: 0, opacity: 0 }} 
              className="overflow-hidden"
            >
              <div className="flex bg-up-bg/50 p-6 border border-up-border space-y-6">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-up-navy tracking-widest block mb-4 border-b border-up-border pb-1">Selección de Indicadores</span>
                    <div className="flex flex-wrap gap-2">
                      {/* Regular Indicators */}
                      {indicators.filter(i => i.active && i.group !== 'CSAT').map(channel => (
                        <button
                          key={channel.key}
                          type="button"
                          onClick={() => toggleStagedChannel(channel.key)}
                          className={cn(
                            "px-3 py-1 text-[9px] uppercase font-bold border transition-all flex items-center gap-1.5",
                            stagedChannels.includes(channel.key) 
                              ? "bg-up-navy text-white border-up-navy shadow-md" 
                              : "bg-white text-gray-400 border-up-border"
                          )}
                        >
                          {channel.label}
                        </button>
                      ))}
                      {/* Unified CSAT Indicator */}
                      <button
                        type="button"
                        onClick={toggleCSAT}
                        className={cn(
                          "px-3 py-1 text-[9px] uppercase font-bold border transition-all flex items-center gap-1.5",
                          isCSATActive 
                            ? "bg-up-gold text-white border-up-gold shadow-md" 
                            : hasSomeCSAT ? "border-up-gold text-up-gold" : "bg-white text-gray-400 border-up-border"
                        )}
                      >
                        CSAT (Satisfacción)
                      </button>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-up-navy tracking-widest block mb-4 border-b border-up-border pb-1">Filtrar por Colaboradores</span>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-2">
                      {relevantAssistantsForCurrentArea.map(assistant => (
                        <button
                          key={assistant.id}
                          type="button"
                          onClick={() => toggleStagedAssistant(assistant.id)}
                          className={cn(
                            "px-3 py-1 text-[9px] uppercase font-bold border transition-all",
                            stagedAssistants.includes(assistant.id) 
                              ? "bg-up-gold text-white border-up-gold" 
                              : "bg-white text-gray-400 border-up-border"
                          )}
                        >
                          {assistant.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end items-center gap-4 pt-4 border-t border-up-border">
                  <div className="mr-auto text-[9px] italic text-gray-400">
                    * Modifica los filtros y presiona "Ir / Aplicar" para actualizar el Dashboard.
                  </div>
                  <button 
                    onClick={() => {
                      setStagedChannels(indicators.map(c => c.key));
                      setStagedAssistants(relevantAssistantsForCurrentArea.map(a => a.id));
                    }}
                    className="text-[10px] uppercase font-bold text-gray-400 hover:text-red-500 transition-colors"
                  >
                    Resetear Panel
                  </button>
                  <button 
                    onClick={applyAdvancedFilters} 
                    className="bg-up-navy text-white px-8 py-2 text-[10px] uppercase font-bold tracking-widest hover:bg-up-ink transition-all shadow-md flex items-center gap-2"
                  >
                    Ir / Aplicar Filtros
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {filter === 'año' && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }} 
              animate={{ height: 'auto', opacity: 1 }} 
              exit={{ height: 0, opacity: 0 }} 
              className="overflow-hidden"
            >
              <div className="flex items-center gap-6 bg-up-bg/50 p-4 border border-up-border">
                <div className="flex items-center gap-3">
                  <span className="text-[9px] uppercase font-bold text-gray-500">Seleccionar Ejercicio:</span>
                  <select 
                    value={selectedYear} 
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="bg-white border border-up-border px-3 py-1 text-xs font-serif italic focus:outline-none focus:border-up-gold"
                  >
                    {availableYears.map(y => <option key={y} value={y}>Año {y}</option>)}
                  </select>
                </div>
                <div className="ml-auto text-[10px] italic text-gray-400">Visualizando acumulación total del año seleccionado</div>
              </div>
            </motion.div>
          )}

          {filter === 'personalizado' && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }} 
              animate={{ height: 'auto', opacity: 1 }} 
              exit={{ height: 0, opacity: 0 }} 
              className="overflow-hidden"
            >
              <div className="flex items-center gap-6 bg-up-bg/50 p-4 border border-up-border">
                <div className="flex items-center gap-3">
                  <span className="text-[9px] uppercase font-bold text-gray-500">Desde:</span>
                  <input 
                    type="date" 
                    value={dateRange.start} 
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="bg-white border border-up-border px-2 py-1 text-xs font-serif italic focus:outline-none focus:border-up-gold"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[9px] uppercase font-bold text-gray-500">Hasta:</span>
                  <input 
                    type="date" 
                    value={dateRange.end} 
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="bg-white border border-up-border px-2 py-1 text-xs font-serif italic focus:outline-none focus:border-up-gold"
                  />
                </div>
                <div className="ml-auto text-[10px] italic text-gray-400">Filtrando registros históricos por rango manual</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex border-up-border divide-x divide-up-border border bg-white shadow-sm">
        <div className="flex-1 p-6 text-center border-r border-up-border">
          <span className="metric-label">Atenciones Presenciales</span>
          <b className="metric-val">{totalStats.presencial}</b>
        </div>
        <div className="flex-1 p-6 text-center border-r border-up-border">
          <span className="metric-label">Total Llamadas</span>
          <b className="metric-val">{totalStats.llamadas}</b>
        </div>
        <div className="flex-1 p-6 text-center">
          <span className="metric-label">Canales Digitales</span>
          <b className="metric-val">{totalStats.correo + totalStats.casos}</b>
        </div>
      </div>

      <div className="h-[350px] border border-up-border p-8 bg-white shadow-sm overflow-hidden flex items-center justify-center">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData as any[]} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: 'Georgia', fontStyle: 'italic', fill: '#666' }} />
              <YAxis tick={{ fontSize: 10, fill: '#999' }} />
              <Tooltip 
                cursor={{ fill: '#f8f8f8' }}
                content={<CustomTooltip />}
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 'bold', paddingTop: '10px' }} />
              {dashboardMode !== 'canal' ? (
                <>
                  {indicators.filter(i => i.active).map((indic, i) => (
                    <Bar key={indic.key} dataKey={indic.key} fill={['#003366', '#c5a059', '#1a1a1a', '#666666', '#22c55e', '#eab308', '#ef4444', '#a855f7', '#ec4899'][i % 9]} name={indic.label} stackId="a" />
                  ))}
                </>
              ) : (
                <Bar dataKey="value" name="Atenciones Totales" fill="#003366">
                  {chartData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              )}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center">
             <div className="w-12 h-12 bg-up-bg rounded-full flex items-center justify-center mx-auto mb-4 border border-up-border">
                <AlertCircle className="text-up-gold" size={20} />
             </div>
             <div className="text-[10px] uppercase font-bold text-up-navy tracking-widest">No hay datos registrados</div>
             <p className="text-[9px] text-gray-400 mt-1 italic">Intenta cambiar el periodo o los filtros avanzados.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const RecordForm = ({ onSave, assistants, areas, onCreateAssistant, indicators }: { onSave: (data: any) => void, assistants: Assistant[], areas: Area[], onCreateAssistant: (name: string, areaId: string) => Promise<any>, indicators: Indicator[] }) => {
  const [entryMode, setEntryMode] = useState<'individual' | 'canal' | 'archivo'>('individual');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  // Individual Mode State
  const [formData, setFormData] = useState<any>({
    assistantId: '',
    areaId: '',
  });
  const [activeFields, setActiveFields] = useState<string[]>([]);

  // Bulk Mode State
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [bulkValues, setBulkValues] = useState<Record<string, number>>({});

  // File Upload State
  const [uploadData, setUploadData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fields = indicators.filter(i => i.active).map(i => ({
    key: i.key,
    label: i.label,
    icon: i.iconName === 'Building2' ? Building2 : 
          i.iconName === 'Mail' ? Mail : 
          i.iconName === 'PhoneCall' ? PhoneCall : 
          i.iconName === 'Database' ? Database : 
          i.iconName === 'FileSpreadsheet' ? FileSpreadsheet : 
          i.iconName === 'CheckCircle2' ? CheckCircle2 :
          i.iconName === 'AlertCircle' ? AlertCircle :
          i.iconName === 'Trash2' ? Trash2 : PlusCircle
  }));

  const handleToggleField = (field: string) => {
    setActiveFields(prev => prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]);
    if (activeFields.includes(field)) {
      setFormData((prev: any) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    } else {
      setFormData((prev: any) => ({ ...prev, [field]: 0 }));
    }
  };

  const handleIndividualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.assistantId || !date || activeFields.length === 0) return;
    onSave({ ...formData, date });
    setFormData({
      assistantId: '',
      areaId: '',
    });
    setActiveFields([]);
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChannel || !date) return;
    
    Object.entries(bulkValues).forEach(([asisId, val]) => {
      const value = val as number;
      if (value > 0) {
        const asis = assistants.find(a => a.id === asisId);
        onSave({
          assistantId: asisId,
          areaId: asis?.areaId || '',
          date,
          [selectedChannel]: value
        });
      }
    });
    
    setBulkValues({});
    setSelectedChannel('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setUploadError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        let data: any[] = [];

        if (file.name.endsWith('.csv')) {
          const result = Papa.parse(bstr as string, { header: true, skipEmptyLines: true });
          data = result.data;
        } else {
          const workbook = XLSX.read(bstr, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          data = XLSX.utils.sheet_to_json(worksheet);
        }

        // Basic validation: must have Colaborador column or Teams column
        if (data.length > 0) {
          const headers = Object.keys(data[0]);
          const hasAssistant = headers.some(h => 
            h.toLowerCase().includes('colaborador') || 
            h.toLowerCase().includes('nombre') || 
            h.toLowerCase().includes('agente teams')
          );
          if (!hasAssistant) throw new Error("No se encontró la columna 'Colaborador' o 'Nombre de agente Teams'. Verifique el formato.");
          
          setUploadData(data);
        } else {
          throw new Error("El archivo está vacío.");
        }
      } catch (err: any) {
        setUploadError(err.message || "Error al procesar el archivo.");
      } finally {
        setIsProcessing(false);
      }
    };

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  const handleProcessUpload = async () => {
    if (uploadData.length === 0) return;

    let successCount = 0;
    
    // We use a for...of loop to handle async creation if needed
    for (const row of uploadData) {
      // Find assistant column
      const assistantCol = Object.keys(row).find(h => 
        h.toLowerCase().includes('colaborador') || 
        h.toLowerCase().includes('nombre') || 
        h.toLowerCase().includes('agente teams')
      );
      
      if (!assistantCol) continue;
      
      const assistantName = row[assistantCol]?.toString().trim();
      if (!assistantName) continue;

      let assistant = assistants.find(a => 
        a.name.toLowerCase() === assistantName.toLowerCase() || 
        a.id.toLowerCase() === assistantName.toLowerCase()
      );
      
      // Auto-create if not found
      if (!assistant) {
        // Find best area: if we are in an area view, use it. Otherwise use first area or 'Sin Asignar'
        const defaultAreaId = areas.length > 0 ? areas[0].id : 'sin-asignar';
        assistant = await onCreateAssistant(assistantName, defaultAreaId);
      }

      const recordData: any = {
        assistantId: assistant?.id,
        areaId: assistant?.areaId,
        date
      };

      let hasMetrics = false;
      fields.forEach(f => {
        const col = Object.keys(row).find(h => h.toLowerCase().replace(/\s+/g, '') === f.label.toLowerCase().replace(/\s+/g, ''));
        if (col && row[col] !== undefined) {
          const val = parseInt(row[col]);
          if (!isNaN(val) && val > 0) {
            recordData[f.key] = val;
            hasMetrics = true;
          }
        }
      });

      if (hasMetrics) {
        onSave(recordData);
        successCount++;
      }
    }

    if (successCount > 0) {
      setUploadData([]);
    } else {
      setUploadError("No se pudieron emparejar los colaboradores del archivo con los del sistema. Verifique los nombres.");
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex justify-between items-center mb-8 border-b border-up-border pb-4">
        <h2 className="pane-title mb-0 border-none pb-0">Registro de Actividad</h2>
        <div className="flex bg-up-bg p-1 border border-up-border rounded-none">
          <button 
            onClick={() => setEntryMode('individual')} 
            className={cn("px-4 py-1.5 text-[10px] uppercase font-bold tracking-widest transition-all", entryMode === 'individual' ? "bg-up-navy text-white" : "text-gray-400 hover:text-up-navy")}
          >
            Modo Individual
          </button>
          <button 
            onClick={() => setEntryMode('canal')} 
            className={cn("px-4 py-1.5 text-[10px] uppercase font-bold tracking-widest transition-all", entryMode === 'canal' ? "bg-up-navy text-white" : "text-gray-400 hover:text-up-navy")}
          >
            Ingreso por Canal
          </button>
          <button 
            onClick={() => setEntryMode('archivo')} 
            className={cn("px-4 py-1.5 text-[10px] uppercase font-bold tracking-widest transition-all", entryMode === 'archivo' ? "bg-up-navy text-white" : "text-gray-400 hover:text-up-navy")}
          >
            Carga Masiva (Excel/CSV)
          </button>
        </div>
      </div>

      <div className="mb-12 border-b border-up-border pb-8">
        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest block mb-4">Fecha de Operación</span>
        <input 
          type="date" 
          value={date} 
          onChange={(e) => setDate(e.target.value)} 
          className="font-serif italic text-lg border-b border-up-navy bg-transparent py-1 w-full max-w-xs focus:outline-none focus:border-up-gold" 
        />
      </div>
      
      {entryMode === 'individual' ? (
        <form onSubmit={handleIndividualSubmit} className="space-y-8">
          <div className="space-y-4 max-w-xl">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Colaborador / Área Destino</span>
            <select 
              value={formData.assistantId}
              onChange={(e) => {
                const asis = assistants.find(a => a.id === e.target.value);
                setFormData((prev: any) => ({ ...prev, assistantId: e.target.value, areaId: asis?.areaId || '' }));
              }}
              className="w-full font-serif italic text-lg border-b border-up-navy bg-transparent py-1 focus:outline-none focus:border-up-gold transition-colors"
            >
              <option value="">Seleccionar Asistente...</option>
              {assistants.filter(a => a.active).sort((a,b) => a.name.localeCompare(b.name)).map(a => (
                <option key={a.id} value={a.id}>{a.name} — {areas.find(ar => ar.id === a.areaId)?.name || 'Sin área'}</option>
              ))}
            </select>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-gray-300 block mb-6 italic tracking-tight underline underline-offset-4 decoration-up-gold/30">Habilitar canales reportados en este turno</span>
            <div className="flex flex-wrap gap-2 mb-8">
              {fields.map(f => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => handleToggleField(f.key)}
                  className={cn(
                    "px-4 py-1.5 border group transition-all flex items-center gap-2",
                    activeFields.includes(f.key) 
                      ? "bg-up-navy text-white border-up-navy shadow-md" 
                      : "border-up-border text-gray-400 hover:border-up-navy/50"
                  )}
                >
                  <PlusCircle size={11} className={cn("transition-transform", activeFields.includes(f.key) ? "rotate-45" : "group-hover:scale-110")} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">{f.label}</span>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {fields.filter(f => activeFields.includes(f.key)).map(f => (
                <div key={f.key} className="metric-box border-up-gold/50 shadow-sm">
                  <span className="metric-label text-up-navy opacity-70">{f.label}</span>
                  <input
                    type="number"
                    placeholder="0"
                    value={formData[f.key] === 0 ? "" : formData[f.key]}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, [f.key]: parseInt(e.target.value) || 0 }))}
                    className="metric-val w-full bg-transparent text-center focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          <button type="submit" className="editorial-button bg-up-navy text-white py-4 text-serif italic text-xl normal-case hover:bg-up-ink transition-colors mt-8">
            Validar y Consolidar Registro Individual
          </button>
        </form>
      ) : entryMode === 'canal' ? (
        <form onSubmit={handleBulkSubmit} className="space-y-12">
          <div className="space-y-4 max-w-xl">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Canal de Productividad a Reportar</span>
            <select 
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="w-full font-serif italic text-lg border-b border-up-navy bg-transparent py-1 focus:outline-none focus:border-up-gold transition-colors"
            >
              <option value="">Seleccionar Canal...</option>
              {fields.map(f => (
                <option key={f.key} value={f.key}>{f.label}</option>
              ))}
            </select>
          </div>

          {selectedChannel && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <span className="text-[10px] uppercase font-bold text-gray-300 block mb-4 italic tracking-tight underline underline-offset-4 decoration-up-gold/30">Ingreso simultáneo para el equipo activo</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assistants.filter(a => a.active).sort((a,b) => a.name.localeCompare(b.name)).map(assistant => (
                  <div key={assistant.id} className="flex items-center gap-4 p-4 border border-up-border bg-white shadow-sm hover:border-up-gold/50 transition-colors">
                    <div className="flex-1">
                      <div className="font-bold text-xs">{assistant.name}</div>
                      <div className="text-[8px] uppercase tracking-widest text-gray-400">{areas.find(ar => ar.id === assistant.areaId)?.name}</div>
                    </div>
                    <input 
                      type="number" 
                      placeholder="0"
                      value={bulkValues[assistant.id] || ""}
                      onChange={(e) => setBulkValues(prev => ({ ...prev, [assistant.id]: parseInt(e.target.value) || 0 }))}
                      className="w-20 border-b border-up-navy text-center font-serif italic text-lg focus:outline-none focus:border-up-gold bg-transparent"
                    />
                  </div>
                ))}
              </div>
              <button type="submit" className="editorial-button bg-up-navy text-white py-4 text-serif italic text-xl normal-case hover:bg-up-ink transition-colors mt-8">
                Consolidar Reporte Grupal por Canal
              </button>
            </motion.div>
          )}
        </form>
      ) : (
        <div className="space-y-8">
           <div className="bg-up-bg/50 border-2 border-dashed border-up-border p-12 text-center group hover:border-up-navy transition-all">
              <input 
                type="file" 
                id="file-upload" 
                className="hidden" 
                accept=".csv, .xlsx, .xls"
                onChange={handleFileUpload}
              />
              <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                  <Upload className="text-up-navy" size={24} />
                </div>
                <div>
                  <div className="text-sm font-bold text-up-navy uppercase tracking-widest">Subir Archivo de Métricas</div>
                  <p className="text-[10px] text-gray-400 mt-2">Formatos aceptados: .XLSX, .CSV (UTF-8)</p>
                </div>
              </label>
           </div>

           <div className="bg-white border border-up-border p-6 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-up-gold tracking-widest block mb-4 flex items-center gap-2">
                <FileText size={12} /> Instrucciones de Formato
              </span>
              <p className="text-[11px] text-gray-500 leading-relaxed mb-4">
                El archivo debe contener una columna llamada <span className="font-bold text-up-navy">"Colaborador"</span> (o Nombre) y columnas con los nombres de los canales (<span className="text-up-navy font-bold">Bmatic, Correo, Llamadas Entrantes, Llamadas Salientes, Salesforce, Drive</span>).
              </p>
              <div className="bg-up-bg p-3 border border-up-border font-mono text-[9px] text-gray-400 overflow-x-auto">
                Colaborador, Bmatic, Correo, Salesforce<br/>
                Astrid Neira, 15, 20, 5<br/>
                Lía Najarro, 20, 15, 10
              </div>
           </div>

           {uploadError && (
             <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="p-4 bg-red-50 border border-red-100 flex items-center gap-3">
                <AlertCircle className="text-red-500" size={16} />
                <span className="text-xs font-bold text-red-600">{uploadError}</span>
             </motion.div>
           )}

           {uploadData.length > 0 && (
             <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="flex justify-between items-end border-b border-up-border pb-2">
                  <span className="text-[10px] uppercase font-bold text-green-600 flex items-center gap-2">
                    <CheckCircle2 size={12} /> Archivo Preparado ({uploadData.length} filas detectadas)
                  </span>
                  <button onClick={() => setUploadData([])} className="text-[9px] uppercase font-bold text-gray-400 hover:text-red-500">Descartar</button>
                </div>

                <div className="max-h-60 overflow-y-auto border border-up-border bg-up-bg/30">
                  <table className="w-full text-left text-[10px]">
                    <thead className="sticky top-0 bg-white border-b border-up-border">
                      <tr>
                        {Object.keys(uploadData[0]).slice(0, 5).map(h => (
                          <th key={h} className="p-2 font-bold uppercase text-gray-500">{h}</th>
                        ))}
                        {Object.keys(uploadData[0]).length > 5 && <th className="p-2">...</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {uploadData.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-b border-up-border/50">
                           {Object.values(row).slice(0, 5).map((v: any, j) => (
                             <td key={j} className="p-2 opacity-70">{v}</td>
                           ))}
                           {Object.keys(row).length > 5 && <td className="p-2"></td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button 
                  onClick={handleProcessUpload}
                  disabled={isProcessing}
                  className="editorial-button bg-up-navy text-white py-4 text-serif italic text-xl normal-case hover:bg-up-ink transition-all flex items-center justify-center gap-3"
                >
                  {isProcessing ? (
                    <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full"></div>
                  ) : (
                    "Procesar y Cargar Métricas al Sistema"
                  )}
                </button>
             </motion.div>
           )}
        </div>
      )}
    </motion.div>
  );
};

const HistoryView = ({ records, assistants, areas, onDelete, indicators }: { records: ProductivityRecord[], assistants: Assistant[], areas: Area[], onDelete: (id: string) => void, indicators: Indicator[] }) => {
  const [showFilters, setShowFilters] = useState(false);
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ 
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'), 
    end: format(new Date(), 'yyyy-MM-dd') 
  });
  
  const allIndicators = indicators.filter(i => i.active);

  const [appliedArea, setAppliedArea] = useState('all');
  const [appliedRange, setAppliedRange] = useState(dateRange);
  const [appliedAssistants, setAppliedAssistants] = useState<string[]>(assistants.map(a => a.id));
  const [appliedChannels, setAppliedChannels] = useState<string[]>(allIndicators.map(c => c.key));

  const [stagedAssistants, setStagedAssistants] = useState<string[]>(appliedAssistants);
  const [stagedChannels, setStagedChannels] = useState<string[]>(appliedChannels);

  const toggleCSAT = () => {
    const csatKeys = indicators.filter(i => i.group === 'CSAT').map(i => i.key);
    const hasAll = csatKeys.every(k => stagedChannels.includes(k));
    if (hasAll) {
      setStagedChannels(prev => prev.filter(k => !csatKeys.includes(k)));
    } else {
      setStagedChannels(prev => Array.from(new Set([...prev, ...csatKeys])));
    }
  };

  const isCSATActive = indicators.filter(i => i.group === 'CSAT').every(i => stagedChannels.includes(i.key));
  const hasSomeCSAT = indicators.filter(i => i.group === 'CSAT').some(i => stagedChannels.includes(i.key));

  useEffect(() => {
    const relevantIds = assistants.filter(a => {
      if (appliedArea === 'all') return true;
      if (appliedArea === 'idiomas-all') return a.areaId === 'idiomas-si' || a.areaId === 'idiomas-mf';
      return a.areaId === appliedArea;
    }).map(a => a.id);
    setStagedAssistants(relevantIds);
    setAppliedAssistants(relevantIds);
  }, [appliedArea, assistants]);

  const filteredRecords = records.filter(r => {
    const date = parseISO(r.date);
    const start = parseISO(appliedRange.start);
    const end = parseISO(appliedRange.end);
    
    let areaMatch = false;
    if (appliedArea === 'all') areaMatch = true;
    else if (appliedArea === 'idiomas-all') areaMatch = r.areaId === 'idiomas-si' || r.areaId === 'idiomas-mf';
    else areaMatch = r.areaId === appliedArea;

    const assistantMatch = appliedAssistants.includes(r.assistantId);
    const dateMatch = date >= start && date <= end;

    return areaMatch && assistantMatch && dateMatch;
  });

  const applyFilters = () => {
    setAppliedRange(dateRange);
    setAppliedAssistants(stagedAssistants);
    setAppliedChannels(stagedChannels);
    setShowFilters(false);
  };

  const resetFilters = () => {
    const allC = allIndicators.map(c => c.key);
    const allA = assistants.map(a => a.id);
    setSelectedArea('all');
    setAppliedArea('all');
    const startM = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const today = format(new Date(), 'yyyy-MM-dd');
    setDateRange({ start: startM, end: today });
    setAppliedRange({ start: startM, end: today });
    setStagedChannels(allC);
    setAppliedChannels(allC);
    setStagedAssistants(allA);
    setAppliedAssistants(allA);
    setShowFilters(false);
  };

  const exportFiltered = () => {
    const headers = ["Fecha", "Colaborador", "Area", ...appliedChannels.map(k => allIndicators.find(c => c.key === k)?.label || k), "Total"];
    const rows = filteredRecords.map(r => {
      const asis = assistants.find(a => a.id === r.assistantId);
      const area = areas.find(a => a.id === r.areaId);
      const values = appliedChannels.map(k => (r as any)[k] || 0);
      const total = values.reduce((m, n) => m + n, 0);
      return [r.date, asis?.name || 'N/A', area?.name || 'N/A', ...values, total].join(",");
    });
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `export_db_filtrada_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col gap-6 border-b border-up-border pb-6">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-4 mb-1">
              <h2 className="pane-title mb-0 border-none pb-0 uppercase tracking-tighter">Base de Datos Central</h2>
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-50 border border-red-100 text-[8px] uppercase font-bold text-red-500 rounded-sm">
                <Settings size={8} /> Acceso de Supervisor
              </div>
              <button onClick={exportFiltered} className="flex items-center gap-1.5 px-3 py-1 bg-up-bg border border-up-border text-[9px] uppercase font-bold text-up-navy hover:bg-up-navy hover:text-white transition-all shadow-sm">
                <Download size={10} /> Exportar Vista
              </button>
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 border text-[9px] uppercase font-bold transition-all shadow-sm",
                  showFilters ? "bg-up-gold text-white border-up-gold" : "bg-white border-up-border text-gray-500 hover:border-up-gold"
                )}
              >
                <Filter size={10} /> Filtros Avanzados
              </button>
              <button onClick={resetFilters} className="flex items-center gap-1.5 px-3 py-1 bg-white border border-up-border text-[9px] uppercase font-bold text-red-500 hover:bg-red-50 hover:border-red-200 transition-all shadow-sm">
                <Trash2 size={10} /> Limpiar Filtros
              </button>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <select 
                value={selectedArea} 
                onChange={(e) => {
                  setSelectedArea(e.target.value);
                  setAppliedArea(e.target.value);
                }}
                className="font-serif italic text-up-gold bg-transparent focus:outline-none text-sm cursor-pointer border-b border-up-gold/30"
              >
                <option value="all">Todas las Sedes / Áreas</option>
                <option value="idiomas-all">Centro de Idiomas (Consolidado)</option>
                {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <div className="h-4 w-px bg-up-border mx-2"></div>
              <div className="flex items-center gap-2">
                <Calendar size={10} className="text-gray-400" />
                <input 
                  type="date" 
                  value={dateRange.start} 
                  onChange={(e) => setDateRange(p => ({ ...p, start: e.target.value }))}
                  className="text-[10px] border-b border-up-border bg-transparent outline-none font-bold text-gray-600" 
                />
                <span className="text-[9px] text-gray-300">al</span>
                <input 
                  type="date" 
                  value={dateRange.end} 
                  onChange={(e) => setDateRange(p => ({ ...p, end: e.target.value }))}
                  className="text-[10px] border-b border-up-border bg-transparent outline-none font-bold text-gray-600" 
                />
                <button 
                  onClick={() => setAppliedRange(dateRange)}
                  className="text-[9px] uppercase font-bold text-up-navy bg-up-bg px-2 py-0.5 border border-up-border hover:bg-up-navy hover:text-white transition-colors"
                >
                  Ir
                </button>
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
               <div className="bg-up-bg/50 p-6 border border-up-border space-y-6">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-up-navy tracking-widest block mb-4 border-b border-up-border pb-1">Columnas / Indicadores a visualizar</span>
                    <div className="flex flex-wrap gap-2">
                      {allIndicators.filter(i => i.group !== 'CSAT').map(c => (
                        <button key={c.key} onClick={() => setStagedChannels(prev => prev.includes(c.key) ? prev.filter(k => k !== c.key) : [...prev, c.key])} className={cn("px-3 py-1 text-[9px] uppercase font-bold border transition-all", stagedChannels.includes(c.key) ? "bg-up-navy text-white border-up-navy" : "bg-white text-gray-400 border-up-border")}>
                          {c.label}
                        </button>
                      ))}
                      <button
                        onClick={toggleCSAT}
                        className={cn(
                          "px-3 py-1 text-[9px] uppercase font-bold border transition-all",
                          isCSATActive 
                            ? "bg-up-gold text-white border-up-gold shadow-md" 
                            : hasSomeCSAT ? "border-up-gold text-up-gold" : "bg-white text-gray-400 border-up-border"
                        )}
                      >
                        CSAT (Satisfacción)
                      </button>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-up-navy tracking-widest block mb-4 border-b border-up-border pb-1">Restringir a Colaboradores</span>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-2">
                      {assistants.filter(a => {
                        if (appliedArea === 'all') return true;
                        if (appliedArea === 'idiomas-all') return a.areaId === 'idiomas-si' || a.areaId === 'idiomas-mf';
                        return a.areaId === appliedArea;
                      }).map(a => (
                        <button key={a.id} onClick={() => setStagedAssistants(prev => prev.includes(a.id) ? prev.filter(k => k !== a.id) : [...prev, a.id])} className={cn("px-3 py-1 text-[9px] uppercase font-bold border transition-all", stagedAssistants.includes(a.id) ? "bg-up-gold text-white border-up-gold" : "bg-white text-gray-400 border-up-border")}>
                          {a.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end pt-4 border-t border-up-border">
                  <button onClick={applyFilters} className="bg-up-navy text-white px-8 py-2 text-[10px] uppercase font-bold tracking-widest hover:bg-up-ink transition-all shadow-md">
                    Aplicar Configuración Maestro
                  </button>
                </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="border border-up-border bg-white overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b-2 border-up-navy bg-up-bg/30">
              <th className="p-4 font-serif text-sm italic">Colaborador / Unidad</th>
              <th className="p-4 font-serif text-sm italic">Fecha</th>
              {allIndicators.filter(c => appliedChannels.includes(c.key)).map(c => (
                <th key={c.key} className="p-4 text-[9px] uppercase font-bold text-center tracking-widest">{c.label}</th>
              ))}
              <th className="p-4 text-[9px] uppercase font-bold text-center tracking-widest border-l border-up-border">Total</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.sort((a,b) => b.date.localeCompare(a.date)).map(r => {
              const asis = assistants.find(a => a.id === r.assistantId);
              const area = areas.find(a => a.id === r.areaId);
              const totalRow = appliedChannels.reduce((acc, k) => acc + ((r as any)[k] || 0), 0);
              return (
                <tr key={r.id} className="border-b border-up-border hover:bg-up-bg/50 text-sm transition-all group">
                  <td className="p-4">
                    <div className="font-bold text-up-navy group-hover:text-up-gold transition-colors">{asis?.name || '---'}</div>
                    <div className="text-[8px] uppercase tracking-widest text-gray-400 font-bold mt-0.5">{area?.name || 'Sin Área'}</div>
                  </td>
                  <td className="p-4 font-serif italic text-gray-500 opacity-70 whitespace-nowrap">{format(parseISO(r.date), 'dd MMM yyyy', { locale: es })}</td>
                  {allIndicators.filter(c => appliedChannels.includes(c.key)).map(c => (
                    <td key={c.key} className="p-4 text-center tabular-nums text-up-navy opacity-80">{(r as any)[c.key] || 0}</td>
                  ))}
                  <td className="p-4 text-center tabular-nums font-bold border-l border-up-border text-up-gold">{totalRow}</td>
                  <td className="p-4 text-right">
                    <button onClick={() => onDelete(r.id)} className="text-gray-200 hover:text-red-500 transition-colors p-2" title="Eliminar Registro">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredRecords.length === 0 && (
          <div className="p-20 text-center text-gray-400 font-serif italic">No existen registros que coincidan con la búsqueda.</div>
        )}
      </div>
    </motion.div>
  );
};

const ConfigView = ({ assistants, areas, indicators, currentUser, onSaveConfig }: { assistants: Assistant[], areas: Area[], indicators: Indicator[], currentUser: Assistant | null, onSaveConfig: (asis: Assistant[], ar: Area[], indics: Indicator[]) => void }) => {
  const [localAssistants, setLocalAssistants] = useState(assistants);
  const [localAreas, setLocalAreas] = useState(areas);
  const [localIndicators, setLocalIndicators] = useState(indicators);

  const canCreateAll = currentUser?.role === 'DEVELOPER';
  const canCreateAssistants = ['DEVELOPER', 'JEFE', 'SUPERVISOR'].includes(currentUser?.role || '');

  const addArea = () => {
    if (!canCreateAll) return alert("Solo los Desarrolladores pueden crear nuevas áreas.");
    const name = prompt("Nombre de la nueva unidad / área:");
    if (name) setLocalAreas([...localAreas, { id: crypto.randomUUID(), name }]);
  };

  const addIndicator = () => {
    if (!canCreateAll) return alert("Solo los Desarrolladores pueden crear nuevos indicadores.");
    const label = prompt("Nombre del nuevo indicador:");
    if (!label) return;
    const key = label.toLowerCase().replace(/\s+/g, '-').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (localIndicators.some(i => i.key === key)) return alert("El indicador ya existe.");
    
    setLocalIndicators([...localIndicators, { 
      key, 
      label, 
      active: true, 
      iconName: 'PlusCircle' 
    }]);
  };

  const addAssistant = () => {
    if (!canCreateAssistants) return alert("No tienes permisos para crear perfiles.");
    const name = prompt("Nombre completo:");
    if (!name) return;
    
    const roleOptions = canCreateAll 
      ? "1. COLABORADOR\n2. SUPERVISOR\n3. JEFE\n4. DEVELOPER" 
      : "1. COLABORADOR";
    const roleIdx = prompt(`Selecciona el rol:\n${roleOptions}`);
    const roles: UserRole[] = ['COLABORADOR', 'SUPERVISOR', 'JEFE', 'DEVELOPER'];
    const selectedRole = roles[parseInt(roleIdx || '1') - 1] || 'COLABORADOR';

    const areaListStr = localAreas.map((a, i) => `${i+1}. ${a.name}`).join('\n');
    const areaIdx = prompt(`Selecciona el área (número):\n${areaListStr}`);
    const targetArea = localAreas[parseInt(areaIdx || '0') - 1];
    
    if (targetArea) {
      setLocalAssistants([...localAssistants, { id: crypto.randomUUID(), name, areaId: targetArea.id, active: true, role: selectedRole }]);
    } else {
      alert("Operación cancelada.");
    }
  };

  const toggleAssistant = (id: string) => {
    setLocalAssistants(localAssistants.map(a => a.id === id ? { ...a, active: !a.active } : a));
  };

  const toggleIndicator = (key: string) => {
    setLocalIndicators(localIndicators.map(i => i.key === key ? { ...i, active: !i.active } : i));
  };

  const removeArea = (id: string) => {
    if (!canCreateAll) return;
    if (localAssistants.some(as => as.areaId === id)) return alert("No se puede eliminar un área con colaboradores asignados.");
    setLocalAreas(localAreas.filter(a => a.id !== id));
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12 pb-20">
      <div className="flex justify-between items-center border-b-2 border-up-navy pb-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-up-navy/5 border border-up-navy/10 rounded-full flex items-center justify-center">
             <Settings className="text-up-gold" size={20} />
          </div>
          <div>
            <h2 className="pane-title mb-0 border-none pb-0">Control de Estructura</h2>
            <p className="text-[10px] uppercase font-bold text-up-gold tracking-[0.2em] mt-1">
              Sesión como: <span className="text-up-navy">{currentUser?.name} ({currentUser?.role})</span>
            </p>
          </div>
        </div>
        <button onClick={() => onSaveConfig(localAssistants, localAreas, localIndicators)} className="editorial-button w-auto px-10 py-2.5 bg-up-navy text-white text-sm">Sincronizar Cambios</button>
      </div>

      <div className="grid grid-cols-2 gap-16">
        <div className="space-y-8">
          <section className="space-y-6">
            <div className="flex justify-between items-end border-b border-gray-200 pb-2">
              <h3 className="font-serif text-xl italic font-bold text-up-navy">Colaboradores & Roles</h3>
              {canCreateAssistants && (
                <button onClick={addAssistant} className="text-up-gold hover:text-up-navy transition-colors flex items-center gap-1 text-[10px] uppercase font-bold"><Plus size={14} /> Añadir</button>
              )}
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {localAssistants.sort((a,b) => a.name.localeCompare(b.name)).map(a => (
                <div key={a.id} className="flex justify-between items-center p-3 bg-white border border-up-border shadow-sm hover:border-up-gold transition-all">
                  <div>
                    <div className={cn("font-bold text-sm", !a.active && "line-through text-gray-300")}>{a.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[6px] uppercase font-bold bg-up-navy text-white px-1.5 py-0.5 tracking-widest">{a.role}</span>
                      <span className="text-[8px] uppercase font-bold opacity-40 tracking-widest">{localAreas.find(ar => ar.id === a.areaId)?.name}</span>
                    </div>
                  </div>
                  <button onClick={() => toggleAssistant(a.id)} className={cn("text-[9px] px-2 py-1 uppercase font-bold border transition-colors", a.active ? "border-red-100 text-red-500 hover:bg-red-50" : "border-up-navy text-up-navy hover:bg-up-navy hover:text-white")}>
                    {a.active ? 'Suspender' : 'Reactivar'}
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex justify-between items-end border-b border-gray-200 pb-2">
              <h3 className="font-serif text-xl italic font-bold text-up-navy">Indicadores de Gestión</h3>
              {canCreateAll && (
                <button onClick={addIndicator} className="text-up-gold hover:text-up-navy transition-colors flex items-center gap-1 text-[10px] uppercase font-bold"><Plus size={14} /> Añadir</button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {localIndicators.map(i => (
                <button 
                  key={i.key} 
                  onClick={() => toggleIndicator(i.key)}
                  className={cn(
                    "flex flex-col p-3 border transition-all text-left group",
                    i.active ? "bg-white border-up-border hover:border-up-gold" : "bg-gray-50 border-transparent opacity-50"
                  )}
                >
                  <div className="flex justify-between items-center w-full mb-1">
                    <span className="text-[10px] font-bold text-up-navy group-hover:text-up-gold">{i.label}</span>
                    <div className={cn("w-1.5 h-1.5 rounded-full", i.active ? (i.group === 'CSAT' ? "bg-green-500" : "bg-up-gold") : "bg-gray-300")} />
                  </div>
                  <span className="text-[7px] uppercase font-bold text-gray-400 tracking-widest leading-none">
                    {i.group === 'CSAT' ? 'Métrica Sat.' : 'Operativo'}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <div className="flex justify-between items-end border-b border-gray-200 pb-2">
            <h3 className="font-serif text-xl italic font-bold text-up-navy">Unidades / Áreas</h3>
            {canCreateAll && (
              <button onClick={addArea} className="text-up-gold hover:text-up-navy transition-colors flex items-center gap-1 text-[10px] uppercase font-bold"><Plus size={14} /> Añadir</button>
            )}
          </div>
          <div className="space-y-2">
            {localAreas.map(a => (
              <div key={a.id} className="flex justify-between items-center p-3 bg-white border border-up-border shadow-sm">
                <span className="font-bold text-sm text-gray-700">{a.name}</span>
                {canCreateAll && (
                  <button onClick={() => removeArea(a.id)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
                )}
              </div>
            ))}
          </div>
          
          <div className="mt-12 p-6 bg-red-50 border border-red-100 italic font-serif text-xs text-red-800 space-y-4 shadow-inner">
             <p>“El éxito de la gestión no solo reside en la cantidad, sino en la transparencia y jerarquía del equipo que operan con integridad.”</p>
             <div className="text-right text-[10px] uppercase font-bold tracking-widest">— Auditoría de Sistemas</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// --- Main App ---

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [records, setRecords] = useState<ProductivityRecord[]>([]);
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [currentUser, setCurrentUser] = useState<Assistant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      const [recRes, configRes] = await Promise.all([fetch('/api/records'), fetch('/api/config')]);
      const recs = await recRes.json();
      const config = await configRes.json();
      setRecords(recs);
      setAssistants(config.assistants);
      setAreas(config.areas);
      setIndicators(config.indicators || []);
      
      // Mock Ed Chavez as Developer
      const dev = config.assistants.find((a: any) => a.role === 'DEVELOPER');
      setCurrentUser(dev || config.assistants[0]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const saveRecord = async (data: any) => {
    const res = await fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) await init();
    setView('dashboard');
  };

  const deleteRecord = async (id: string) => {
    const record = records.find(r => r.id === id);
    const asis = assistants.find(a => a?.id === record?.assistantId);
    
    if (!confirm(`⚠️ ALERTA DE SUPERVISOR\n\n¿Está seguro de que desea eliminar el registro de "${asis?.name || 'este colaborador'}" del día ${record?.date}?\n\nEsta acción es irreversible y afectará los totales del Dashboard.`)) return;
    
    const res = await fetch(`/api/records/${id}`, { method: 'DELETE' });
    if (res.ok) setRecords(records.filter(r => r.id !== id));
  };

  const saveConfig = async (asis: Assistant[], ar: Area[], indics: Indicator[]) => {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assistants: asis, areas: ar, indicators: indics }),
    });
    if (res.ok) await init();
    setView('dashboard');
  };

  const createAssistant = async (name: string, areaId: string) => {
    const newAssistant: Assistant = {
      id: name.toLowerCase().replace(/\s+/g, '-').normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
      name,
      areaId,
      active: true,
      role: 'COLABORADOR'
    };
    
    // Check if it already exists in local state to avoid duplicate calls in same batch
    if (assistants.some(a => a.id === newAssistant.id)) return assistants.find(a => a.id === newAssistant.id);

    const updatedAssistants = [...assistants, newAssistant];
    await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assistants: updatedAssistants, areas, indicators }),
    });
    
    setAssistants(updatedAssistants);
    return newAssistant;
  };

  const TeamPane = ({ records, assistants, areas, indicators }: { records: ProductivityRecord[], assistants: Assistant[], areas: Area[], indicators: Indicator[] }) => {
    const [preferredArea, setPreferredArea] = useState<string>(() => localStorage.getItem('up-prev-area') || 'all');
    const [displayMode, setDisplayMode] = useState<'colaborador' | 'canal'>('colaborador');
    
    useEffect(() => {
      localStorage.setItem('up-prev-area', preferredArea);
    }, [preferredArea]);

    const sortedUniqueDates = Array.from(new Set(records.map(r => r.date))).sort((a,b) => b.localeCompare(a));
    const lastTwoDates = sortedUniqueDates.slice(0, 2);
    
    const allIndicators = indicators.filter(i => i.active);

    const getDayRecords = (date: string) => {
      return records.filter(r => r.date === date && (
        preferredArea === 'all' ? true : 
        preferredArea === 'idiomas-all' ? (r.areaId === 'idiomas-si' || r.areaId === 'idiomas-mf') :
        r.areaId === preferredArea
      ));
    };

    return (
      <section className="bg-up-bg p-6 flex flex-col border-r border-up-border overflow-y-auto">
        <div className="mb-6">
          <h2 className="pane-title text-up-navy mb-2 uppercase tracking-tighter">Resumen Diario</h2>
          <select 
            value={preferredArea} 
            onChange={(e) => setPreferredArea(e.target.value)}
            className="w-full text-[10px] uppercase font-bold tracking-widest text-up-gold bg-white border border-up-border p-2 focus:outline-none shadow-sm"
          >
            <option value="all">Elegir Área (Todas)</option>
            <option value="idiomas-all">Centro de Idiomas</option>
            {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>

        <div className="mb-8 flex bg-white border border-up-border p-1 shadow-sm">
          <button 
            onClick={() => setDisplayMode('canal')} 
            className={cn(
              "flex-1 py-2 text-[8px] uppercase font-bold tracking-widest transition-all text-center",
              displayMode === 'canal' ? "bg-up-navy text-white" : "text-gray-400 hover:text-up-navy"
            )}
          >
            Vista por Indicador
          </button>
          <button 
            onClick={() => setDisplayMode('colaborador')} 
            className={cn(
              "flex-1 py-2 text-[8px] uppercase font-bold tracking-widest transition-all text-center",
              displayMode === 'colaborador' ? "bg-up-navy text-white" : "text-gray-400 hover:text-up-navy"
            )}
          >
            Vista por Colaborador
          </button>
        </div>

        <div className="space-y-12">
          {lastTwoDates.map((date, idx) => {
            const dayRecs = getDayRecords(date);
            const isToday = date === format(new Date(), 'yyyy-MM-dd');
            
            return (
              <div key={date} className={cn("space-y-6", idx > 0 && "opacity-60 pt-6 border-t border-dashed border-up-border")}>
                <div className="flex justify-between items-center bg-white p-2 border border-up-border">
                  <span className="text-[10px] font-bold text-up-navy uppercase tracking-widest">
                    {isToday ? 'Hoy' : 'Día Previo'} — {format(parseISO(date), 'dd MMM', { locale: es })}
                  </span>
                  <div className="text-[11px] font-serif italic font-bold text-up-gold">
                    Tot: {dayRecs.reduce((acc, r) => acc + (indicators.reduce((sum, i) => sum + ((r as any)[i.key] || 0), 0)), 0)}
                  </div>
                </div>

                <div className="space-y-4">
                  {displayMode === 'canal' ? (
                    <div>
                      <span className="text-[8px] uppercase font-bold text-gray-400 tracking-widest block mb-2 border-l-2 border-up-gold pl-2">Desglose por Indicador</span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {allIndicators.map(channel => {
                          const channelTotal = dayRecs.reduce((acc, r) => acc + ((r as any)[channel.key] || 0), 0);
                          if (channelTotal === 0) return null;
                          return (
                            <div key={channel.key} className="p-2 bg-white border border-up-border group hover:border-up-navy transition-colors">
                              <div className="text-[7px] uppercase font-bold text-gray-400 leading-none mb-1">{channel.label}</div>
                              <div className="flex justify-between items-end">
                                <span className="font-serif italic text-sm font-bold text-up-navy">{channelTotal}</span>
                                <div className="flex flex-col gap-0.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {dayRecs.filter(r => (r as any)[channel.key] > 0).map(r => {
                                    const asis = assistants.find(a => a.id === r.assistantId);
                                    return (
                                      <div key={r.id} className="flex justify-between items-center text-[7px] font-bold text-up-gold border-t border-up-border/30 pt-0.5">
                                        <span className="truncate max-w-[50px]">{asis?.name.split(' ')[0]}</span>
                                        <span>{(r as any)[channel.key]}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span className="text-[8px] uppercase font-bold text-gray-400 tracking-widest block mb-2 border-l-2 border-up-gold pl-2">Desglose por Colaborador</span>
                      <div className="space-y-2">
                        {dayRecs.map(r => {
                          const asis = assistants.find(a => a.id === r.assistantId);
                          const totalAsis = indicators.reduce((acc, i) => acc + ((r as any)[i.key] || 0), 0);
                          return (
                            <div key={r.id} className="p-2 bg-white border border-up-border">
                              <div className="flex justify-between items-start mb-1">
                                <div>
                                  <div className="text-[9px] font-bold text-up-navy leading-none">{asis?.name}</div>
                                  <div className="text-[6px] uppercase font-bold text-gray-300 tracking-widest">{areas.find(ar => ar.id === r.areaId)?.name}</div>
                                </div>
                                <span className="font-serif italic text-xs font-bold text-up-gold">{totalAsis}</span>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {allIndicators.filter(c => (r as any)[c.key] > 0).map(c => (
                                  <span key={c.key} className="text-[6px] uppercase font-bold px-1.5 py-0.5 bg-up-bg text-up-navy border border-up-border/50">
                                    {c.label}: {(r as any)[c.key]}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {lastTwoDates.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 opacity-30">
              <Database size={24} className="mb-2" />
              <span className="text-[10px] uppercase font-bold tracking-widest">Sin datos registrados</span>
            </div>
          )}
        </div>
      </section>
    );
  };

  const ReportPane = ({ currentView, setView }: { currentView: View, setView: (v: View) => void }) => (
    <section className="bg-up-bg p-8 flex flex-col border-l border-up-border overflow-y-auto">
      <h2 className="pane-title">Menú de Control</h2>
      <div className="space-y-3">
        {[
          { id: 'registro', label: 'Nuevo Registro' },
          { id: 'dashboard', label: 'Dashboard Operativo' },
          { id: 'historial', label: 'Base de Datos Central' },
          { id: 'configuracion', label: 'Personalización', icon: Settings }
        ].map((btn) => (
          <button 
            key={btn.id}
            onClick={() => setView(btn.id as View)} 
            className={cn(
              "editorial-button text-xs py-3 flex items-center justify-between group", 
              currentView === btn.id && "bg-up-navy text-white shadow-lg translate-x-1"
            )}
          >
            <span>{btn.label}</span>
            {btn.icon ? <btn.icon size={11} /> : <div className="w-1 h-1 bg-up-gold rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>}
          </button>
        ))}
      </div>
      
      <div className="mt-auto pt-8 border-t border-up-border">
         <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-6 border-l-2 border-up-gold pl-3">Estado Institucional</p>
         <div className="p-4 border border-up-border bg-white/50 space-y-4">
            <div>
               <div className="text-[9px] text-up-navy font-bold uppercase">Áreas Registradas</div>
               <div className="text-xl font-serif italic text-up-gold leading-none mt-1">{areas.length}</div>
            </div>
            <div>
               <div className="text-[9px] text-up-navy font-bold uppercase">Personal Activo</div>
               <div className="text-xl font-serif italic text-up-gold leading-none mt-1">{assistants.filter(a => a.active).length}</div>
            </div>
         </div>
      </div>
    </section>
  );

  return (
    <div className="h-screen flex flex-col bg-up-bg overflow-hidden selection:bg-up-gold/20">
      <Header />
      <main className="flex-1 grid grid-cols-[300px_1fr_300px] overflow-hidden">
        <TeamPane records={records} assistants={assistants} areas={areas} indicators={indicators} />
        
        <section className="bg-white p-12 overflow-y-auto main-canvas">
          {loading ? (
             <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                   <div className="animate-spin h-10 w-10 border-2 border-up-navy border-t-up-gold rounded-full"></div>
                   <span className="text-[10px] uppercase font-bold text-up-navy tracking-widest opacity-50">Sincronizando Archivos...</span>
                </div>
             </div>
          ) : (
            <AnimatePresence mode="wait">
              {view === 'registro' && <RecordForm onSave={saveRecord} assistants={assistants} areas={areas} onCreateAssistant={createAssistant} indicators={indicators} />}
              {view === 'dashboard' && <Dashboard records={records} assistants={assistants} areas={areas} indicators={indicators} />}
              {view === 'historial' && <HistoryView records={records} assistants={assistants} areas={areas} onDelete={deleteRecord} indicators={indicators} />}
              {view === 'configuracion' && <ConfigView assistants={assistants} areas={areas} indicators={indicators} currentUser={currentUser} onSaveConfig={saveConfig} />}
            </AnimatePresence>
          )}
        </section>
        
        <ReportPane currentView={view} setView={setView} />
      </main>
      <Footer />
    </div>
  );
}
