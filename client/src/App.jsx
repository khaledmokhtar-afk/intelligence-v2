import React, { useState } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, AlertTriangle, Users, List, Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';
import Dashboard from './views/Dashboard';
import ThisWeek from './views/ThisWeek';
import IssuesRisks from './views/IssuesRisks';
import ResponsibilityMatrix from './views/ResponsibilityMatrix';
import AllDeliverables from './views/AllDeliverables';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/weekly', label: 'This Week', icon: Calendar },
  { to: '/issues', label: 'Issues & Risks', icon: AlertTriangle },
  { to: '/matrix', label: 'Responsibility', icon: Users },
  { to: '/deliverables', label: 'All Deliverables', icon: List },
];

function UploadModal({ onClose, onSuccess }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFile = async (file) => {
    setUploading(true);
    setError(null);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const { data } = await axios.post('/api/upload', fd);
      setResult(data);
      onSuccess();
    } catch(e) {
      setError(e.response?.data?.error || e.message);
    }
    setUploading(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">Upload MDR Excel File</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
        </div>
        <div className="p-6">
          {!result && !uploading && (
            <div
              className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${dragging ? 'border-sky-500 bg-sky-50' : 'border-gray-300 hover:border-sky-400'}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <Upload className="mx-auto mb-3 text-gray-400" size={40}/>
              <p className="text-gray-600 mb-1">Drag & drop your MDR Excel file here</p>
              <p className="text-sm text-gray-400 mb-4">Supports .xlsx, .xls</p>
              <label className="cursor-pointer bg-sky-600 text-white px-4 py-2 rounded-lg hover:bg-sky-700 transition-colors">
                Browse File
                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={e => e.target.files[0] && handleFile(e.target.files[0])}/>
              </label>
            </div>
          )}
          {uploading && (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-500 mx-auto mb-4"/>
              <p className="text-gray-600">Processing Excel file...</p>
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
              <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18}/>
              <div>
                <p className="font-medium text-red-700">Upload Failed</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          )}
          {result && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
                <CheckCircle className="text-green-500 shrink-0 mt-0.5" size={18}/>
                <div>
                  <p className="font-medium text-green-700">Import Successful</p>
                  <p className="text-sm text-green-600">{result.imported} deliverables imported{result.quarantined > 0 ? `, ${result.quarantined} quarantined` : ''}</p>
                </div>
              </div>
              {result.quarantined > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="font-medium text-amber-700 mb-2">Quarantined rows ({result.quarantined})</p>
                  <div className="text-sm text-amber-600 max-h-32 overflow-y-auto space-y-1">
                    {result.quarantine.map((q, i) => <div key={i}>Row {q.row}: {q.reason}</div>)}
                  </div>
                </div>
              )}
              {result.unmappedFields?.length > 0 && (
                <div className="bg-gray-50 border rounded-lg p-4">
                  <p className="text-sm text-gray-600">Unmapped fields: {result.unmappedFields.join(', ')}</p>
                </div>
              )}
              <button onClick={onClose} className="w-full bg-sky-600 text-white py-2 rounded-lg hover:bg-sky-700">Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [showUpload, setShowUpload] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b shadow-sm sticky top-0 z-40">
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-sky-600 text-white rounded-lg px-3 py-1.5 font-bold text-sm tracking-wide">MDR</div>
            <span className="font-semibold text-gray-800">Intelligence Platform</span>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-sky-50 text-sky-700' : 'text-gray-600 hover:bg-gray-100'}`}>
                <Icon size={16}/> {label}
              </NavLink>
            ))}
          </nav>
          <button onClick={() => setShowUpload(true)} className="flex items-center gap-2 bg-sky-600 text-white px-4 py-2 rounded-lg hover:bg-sky-700 text-sm font-medium">
            <Upload size={16}/> Upload MDR
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 py-6">
        <Routes>
          <Route path="/" element={<Dashboard key={refreshKey}/>}/>
          <Route path="/weekly" element={<ThisWeek/>}/>
          <Route path="/issues" element={<IssuesRisks/>}/>
          <Route path="/matrix" element={<ResponsibilityMatrix/>}/>
          <Route path="/deliverables" element={<AllDeliverables/>}/>
        </Routes>
      </main>

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={() => { setRefreshKey(k => k+1); }}
        />
      )}
    </div>
  );
}
