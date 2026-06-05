import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { List, Search, Download } from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import axios from 'axios';

function fmt(d) { if (!d) return ''; return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }

const STATUS_COLORS = {
  AFC: 'green', IFR: 'amber', NOT_STARTED: 'gray', CANCELLED: 'red'
};

function StatusCellRenderer({ value }) {
  const colors = { green: 'bg-green-100 text-green-700', amber: 'bg-amber-100 text-amber-700', gray: 'bg-gray-100 text-gray-600', red: 'bg-red-100 text-red-700' };
  const labels = { AFC: 'AFC ✓', IFR: 'IFR', NOT_STARTED: 'Not Started', CANCELLED: 'Cancelled' };
  const c = colors[STATUS_COLORS[value]] || colors.gray;
  return <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${c}`}>{labels[value] || value}</span>;
}

function PctCellRenderer({ value }) {
  const color = value >= 100 ? 'bg-green-500' : value >= 50 ? 'bg-amber-500' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2 h-full">
      <div className="flex-1 bg-gray-200 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full`} style={{ width: `${value}%` }}/>
      </div>
      <span className="text-xs text-gray-600 w-8">{value}%</span>
    </div>
  );
}

export default function AllDeliverables() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [disciplines, setDisciplines] = useState([]);
  const [projects, setProjects] = useState([]);
  const [filters, setFilters] = useState({ status: '', project: '', discipline: '', search: '' });
  const [gridApi, setGridApi] = useState(null);

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k,v]) => { if (v) params.set(k,v); });
    params.set('limit', '1000');
    const { data } = await axios.get(`/api/deliverables?${params}`);
    setRows(data.rows);
    setTotal(data.total);
    setDisciplines(data.disciplines);
    setProjects(data.projects);
  }, [filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const colDefs = useMemo(() => [
    { field: 'id', headerName: 'Doc No', width: 120, pinned: 'left', cellStyle: { fontFamily: 'monospace', fontSize: '11px', color: '#6b7280' } },
    { field: 'title', headerName: 'Title', flex: 2, minWidth: 200 },
    { field: 'project_id', headerName: 'Project', flex: 1, minWidth: 120 },
    { field: 'discipline', headerName: 'Disc.', width: 100 },
    { field: 'phase', headerName: 'Phase', width: 120 },
    { field: 'status', headerName: 'Status', width: 130, cellRenderer: StatusCellRenderer },
    { field: 'completion_pct', headerName: 'Complete', width: 140, cellRenderer: PctCellRenderer, sort: 'desc' },
    { field: 'planned_end', headerName: 'Due Date', width: 120, valueFormatter: p => fmt(p.value) },
    { field: 'ifr_date', headerName: 'IFR Date', width: 110, valueFormatter: p => fmt(p.value) },
    { field: 'afc_date', headerName: 'AFC Date', width: 110, valueFormatter: p => fmt(p.value) },
    { field: 'revision', headerName: 'Rev', width: 70 },
  ], []);

  const defaultColDef = useMemo(() => ({
    sortable: true, filter: true, resizable: true,
  }), []);

  const onGridReady = useCallback(p => setGridApi(p.api), []);
  const onExport = () => gridApi?.exportDataAsCsv({ fileName: 'mdr-deliverables.csv' });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><List size={24}/> All Deliverables <span className="text-base font-normal text-gray-400">({total})</span></h1>
        <button onClick={onExport} className="flex items-center gap-2 border px-3 py-2 rounded-lg text-sm hover:bg-gray-50"><Download size={16}/> Export CSV</button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15}/>
          <input className="pl-9 pr-3 py-2 border rounded-lg text-sm w-52 focus:outline-none focus:ring-2 focus:ring-sky-500" placeholder="Search title or doc no..." value={filters.search} onChange={e => setFilters(f => ({...f, search: e.target.value}))}/>
        </div>
        <select className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" value={filters.status} onChange={e => setFilters(f => ({...f, status: e.target.value}))}>
          <option value="">All Statuses</option>
          <option value="AFC">AFC</option>
          <option value="IFR">IFR</option>
          <option value="NOT_STARTED">Not Started</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" value={filters.project} onChange={e => setFilters(f => ({...f, project: e.target.value}))}>
          <option value="">All Projects</option>
          {projects.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" value={filters.discipline} onChange={e => setFilters(f => ({...f, discipline: e.target.value}))}>
          <option value="">All Disciplines</option>
          {disciplines.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div className="ag-theme-alpine rounded-xl border shadow-sm overflow-hidden" style={{ height: 600 }}>
        <AgGridReact
          rowData={rows}
          columnDefs={colDefs}
          defaultColDef={defaultColDef}
          onGridReady={onGridReady}
          animateRows
          pagination
          paginationPageSize={50}
          rowSelection="single"
        />
      </div>
    </div>
  );
}
