import React, { useState } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import axios from 'axios';

export default function AIPanel({ endpoint, payload = {}, title = 'AI Analysis' }) {
  const [text, setText] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAnalysis = async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.post(endpoint, { ...payload, force });
      setText(data.result);
    } catch(e) {
      setError(e.response?.data?.error || e.message);
    }
    setLoading(false);
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-sky-50 border border-indigo-100 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="text-indigo-500" size={18}/>
          <span className="font-semibold text-indigo-900">{title}</span>
        </div>
        <div className="flex gap-2">
          {text && (
            <button onClick={() => fetchAnalysis(true)} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded hover:bg-indigo-100">
              <RefreshCw size={12}/> Refresh
            </button>
          )}
          {!text && !loading && (
            <button onClick={() => fetchAnalysis(false)} className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors">
              Generate Analysis
            </button>
          )}
        </div>
      </div>
      {loading && (
        <div className="flex items-center gap-3 py-4">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-500"/>
          <span className="text-sm text-indigo-600">Analyzing with Claude...</span>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {text && <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{text}</p>}
    </div>
  );
}
