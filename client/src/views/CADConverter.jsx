import React, { useState, useCallback } from 'react';
import axios from 'axios';
import {
  Upload, FileText, Box, Download, AlertCircle, CheckCircle,
  Loader2, ChevronRight, RotateCcw, Info, Layers
} from 'lucide-react';
import ThreeViewer from '../components/ThreeViewer';

const STEPS = [
  { id: 'upload', label: 'Upload PDF' },
  { id: 'analyze', label: 'AI Analysis' },
  { id: 'view', label: '3D Model' },
];

function StepBar({ step }) {
  const idx = STEPS.findIndex(s => s.id === step);
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((s, i) => (
        <React.Fragment key={s.id}>
          <div className={`flex items-center gap-2 ${i <= idx ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors
              ${i < idx ? 'bg-blue-600 border-blue-600 text-white' :
                i === idx ? 'border-blue-600 text-blue-600' :
                'border-gray-300 text-gray-400'}`}>
              {i < idx ? <CheckCircle size={14} /> : i + 1}
            </div>
            <span className={`text-sm font-medium hidden sm:block ${i === idx ? 'text-blue-600' : ''}`}>{s.label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 rounded ${i < idx ? 'bg-blue-600' : 'bg-gray-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function UploadZone({ onFile }) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'application/pdf' || file.name.endsWith('.pdf'))) {
      onFile(file);
    }
  }, [onFile]);

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file) onFile(file);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-2xl p-16 text-center transition-all cursor-pointer
        ${dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}`}
      onClick={() => document.getElementById('cad-file-input').click()}
    >
      <input
        id="cad-file-input"
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={handleChange}
      />
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
          <Upload size={28} className="text-blue-600" />
        </div>
        <div>
          <p className="text-xl font-semibold text-gray-800">Drop your PDF drawing here</p>
          <p className="text-gray-500 mt-1">or click to browse files</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <FileText size={14} />
          <span>Supports: Engineering drawings, blueprints, CAD plans, technical sheets</span>
        </div>
      </div>
    </div>
  );
}

function AnalyzingState({ fileName }) {
  const [step, setStep] = useState(0);
  const steps = [
    'Parsing PDF document…',
    'Detecting 2D drawing views…',
    'Identifying geometric features…',
    'Extracting dimensions and tolerances…',
    'Generating 3D geometry with AI…',
  ];

  React.useEffect(() => {
    const interval = setInterval(() => setStep(s => Math.min(s + 1, steps.length - 1)), 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center py-16 gap-6">
      <div className="relative">
        <div className="w-20 h-20 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Box size={28} className="text-blue-600" />
        </div>
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold text-gray-800">Analyzing Drawing with AI</p>
        <p className="text-gray-500 mt-1 text-sm">{fileName}</p>
      </div>
      <div className="w-full max-w-md space-y-2">
        {steps.map((s, i) => (
          <div key={i} className={`flex items-center gap-3 text-sm transition-all duration-500
            ${i < step ? 'text-green-600' : i === step ? 'text-blue-600 font-medium' : 'text-gray-300'}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0
              ${i < step ? 'bg-green-100' : i === step ? 'bg-blue-100' : 'bg-gray-100'}`}>
              {i < step ? <CheckCircle size={12} className="text-green-600" /> :
               i === step ? <Loader2 size={12} className="animate-spin text-blue-600" /> :
               <div className="w-2 h-2 rounded-full bg-gray-300" />}
            </div>
            {s}
          </div>
        ))}
      </div>
    </div>
  );
}

function GeometryPanel({ geometry }) {
  const addObjs = (geometry.objects || []).filter(o => o.operation !== 'subtract');
  const subObjs = (geometry.objects || []).filter(o => o.operation === 'subtract');

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
        <h3 className="font-semibold text-blue-800 text-sm mb-1">{geometry.title}</h3>
        <p className="text-blue-600 text-xs leading-relaxed">{geometry.description}</p>
        <div className="flex gap-4 mt-3 text-xs text-blue-500">
          <span>Unit: {geometry.unit || 'mm'}</span>
          <span>Confidence: {Math.round((geometry.confidence || 0.8) * 100)}%</span>
          <span>Type: {geometry.drawing_type || 'mechanical'}</span>
        </div>
      </div>

      {/* Views detected */}
      {geometry.views_detected?.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Views Detected</p>
          <div className="flex flex-wrap gap-1">
            {geometry.views_detected.map(v => (
              <span key={v} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs capitalize">{v}</span>
            ))}
          </div>
        </div>
      )}

      {/* Objects list */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">Features ({addObjs.length} solid, {subObjs.length} cutout)</p>
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {addObjs.map(obj => (
            <div key={obj.id} className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-100 text-xs">
              <div className="w-2 h-2 rounded-sm bg-blue-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-medium text-gray-700 truncate block">{obj.name}</span>
                <span className="text-gray-400 capitalize">{obj.type}</span>
              </div>
              {obj.dimensions && (
                <span className="text-gray-400 flex-shrink-0 hidden sm:block">
                  {obj.dimensions.width}×{obj.dimensions.height}
                </span>
              )}
            </div>
          ))}
          {subObjs.map(obj => (
            <div key={obj.id} className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg border border-red-100 text-xs">
              <div className="w-2 h-2 rounded-sm bg-red-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-medium text-gray-700 truncate block">{obj.name}</span>
                <span className="text-red-400 capitalize">cutout · {obj.type}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CADConverter() {
  const [step, setStep] = useState('upload');
  const [file, setFile] = useState(null);
  const [geometry, setGeometry] = useState(null);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  const handleFile = async (f) => {
    setFile(f);
    setError(null);
    setStep('analyze');

    try {
      const fd = new FormData();
      fd.append('pdf', f);
      const { data } = await axios.post('/api/cad/analyze', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      setGeometry(data.geometry);
      setStep('view');
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Analysis failed');
      setStep('upload');
    }
  };

  const handleReset = () => {
    setStep('upload');
    setFile(null);
    setGeometry(null);
    setError(null);
  };

  const handleExportDXF = async () => {
    if (!geometry) return;
    setExporting(true);
    try {
      const response = await axios.post('/api/cad/export-dxf', { geometry }, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${geometry.title || 'model'}.dxf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Export failed: ' + (e.response?.data?.error || e.message));
    }
    setExporting(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
            <Box size={18} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">2D to 3D CAD Converter</h1>
        </div>
        <p className="text-gray-500 text-sm ml-12">
          Upload engineering drawings as PDF — AI analyzes the 2D views and generates an interactive 3D model
        </p>
      </div>

      <StepBar step={step} />

      {/* Error banner */}
      {error && (
        <div className="mb-6 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Analysis Failed</p>
            <p className="mt-0.5 text-red-600">{error}</p>
          </div>
        </div>
      )}

      {step === 'upload' && (
        <div className="space-y-6">
          <UploadZone onFile={handleFile} />
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
            <Info size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-700">
              <p className="font-medium mb-1">Tips for best results</p>
              <ul className="list-disc list-inside space-y-0.5 text-amber-600">
                <li>Use PDFs with clear vector drawings (not scanned images)</li>
                <li>Orthographic projections (top/front/side views) work best</li>
                <li>Include dimension annotations for accurate sizing</li>
                <li>One part per PDF page recommended</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {step === 'analyze' && <AnalyzingState fileName={file?.name} />}

      {step === 'view' && geometry && (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* 3D Viewer */}
          <div className="xl:col-span-3">
            <div className="bg-gray-900 rounded-2xl overflow-hidden" style={{ height: '600px' }}>
              <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
                <div className="flex items-center gap-2">
                  <Layers size={14} className="text-blue-400" />
                  <span className="text-white text-sm font-medium">{geometry.title}</span>
                  <span className="text-gray-400 text-xs">· {geometry.unit || 'mm'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-xs transition-colors"
                  >
                    <RotateCcw size={12} />
                    New Drawing
                  </button>
                  <button
                    onClick={handleExportDXF}
                    disabled={exporting}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-xs transition-colors"
                  >
                    {exporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                    Export DXF
                  </button>
                </div>
              </div>
              <div style={{ height: 'calc(100% - 49px)' }}>
                <ThreeViewer geometry={geometry} />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="xl:col-span-1 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-2">
                <Box size={14} className="text-blue-600" />
                Model Details
              </h3>
              <GeometryPanel geometry={geometry} />
            </div>

            {/* Export options */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-2">
                <Download size={14} className="text-blue-600" />
                Export
              </h3>
              <div className="space-y-2">
                <button
                  onClick={handleExportDXF}
                  disabled={exporting}
                  className="w-full flex items-center justify-between px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                    Download DXF
                  </div>
                  <span className="text-blue-200 text-xs">CAD Format</span>
                </button>
                <p className="text-xs text-gray-400 text-center">
                  DXF files open in AutoCAD, FreeCAD, SolidWorks & more
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
