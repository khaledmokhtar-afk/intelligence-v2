import React, { useEffect, useState } from 'react';
import { AlertTriangle, Clock, Zap } from 'lucide-react';
import axios from 'axios';
import StatusBadge from '../components/StatusBadge';
import AIPanel from '../components/AIPanel';

function fmt(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }

export default function IssuesRisks() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/issues').then(r => { setData(r.data); setLoading(false); });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"/></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><AlertTriangle size={24}/> Issues &amp; Risks</h1>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="text-3xl font-bold text-red-700">{data?.lateItems?.length ?? 0}</div>
          <div className="text-sm text-red-600 mt-1">Overdue (past due, not AFC)</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="text-3xl font-bold text-amber-700">{data?.atRiskItems?.length ?? 0}</div>
          <div className="text-sm text-amber-600 mt-1">At Risk (due within 14 days)</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <div className="text-3xl font-bold text-purple-700">{data?.stuckItems?.length ?? 0}</div>
          <div className="text-sm text-purple-600 mt-1">Stuck in IFR (&gt;21 days)</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border shadow-sm">
          <div className="p-4 border-b font-semibold text-red-700 flex items-center gap-2"><AlertTriangle size={16}/> Overdue Items</div>
          {data?.lateItems?.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No overdue items</div>
          ) : (
            <div className="divide-y max-h-96 overflow-y-auto">
              {data.lateItems.map(d => (
                <div key={d.id} className="p-4 hover:bg-red-50">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-medium text-gray-900 text-sm">{d.title}</span>
                    <span className="shrink-0 bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap">{d.days_late}d late</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="font-mono">{d.id}</span>
                    <span>{d.discipline || '—'}</span>
                    <span>Due: {fmt(d.planned_end)}</span>
                    <StatusBadge status={d.status} small/>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border shadow-sm">
          <div className="p-4 border-b font-semibold text-amber-700 flex items-center gap-2"><Clock size={16}/> At Risk</div>
          {data?.atRiskItems?.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No items at risk</div>
          ) : (
            <div className="divide-y max-h-96 overflow-y-auto">
              {data.atRiskItems.map(d => (
                <div key={d.id} className="p-4 hover:bg-amber-50">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-medium text-gray-900 text-sm">{d.title}</span>
                    <span className="shrink-0 bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap">in {d.days_until_due}d</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="font-mono">{d.id}</span>
                    <span>{d.discipline || '—'}</span>
                    <span>Due: {fmt(d.planned_end)}</span>
                    <StatusBadge status={d.status} small/>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {data?.stuckItems?.length > 0 && (
        <div className="bg-white rounded-xl border shadow-sm">
          <div className="p-4 border-b font-semibold text-purple-700 flex items-center gap-2"><Zap size={16}/> Stuck in IFR (&gt;21 days)</div>
          <div className="divide-y">
            {data.stuckItems.map(d => (
              <div key={d.id} className="p-4 flex items-center justify-between hover:bg-purple-50">
                <div>
                  <span className="font-medium text-gray-900 text-sm">{d.title}</span>
                  <div className="text-xs text-gray-500 mt-0.5 flex gap-3">
                    <span className="font-mono">{d.id}</span>
                    <span>IFR since: {fmt(d.ifr_date)}</span>
                    <span>{d.project_id}</span>
                  </div>
                </div>
                <StatusBadge status="IFR" small/>
              </div>
            ))}
          </div>
        </div>
      )}

      <AIPanel endpoint="/api/analyze/risks" title="AI Risk Analysis"/>
    </div>
  );
}
