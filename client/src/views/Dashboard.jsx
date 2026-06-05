import React, { useEffect, useState } from 'react';
import { LayoutDashboard, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import axios from 'axios';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';
import AIPanel from '../components/AIPanel';

function HealthBar({ score }) {
  const color = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-gray-200 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${score}%` }}/>
      </div>
      <span className="text-sm font-semibold text-gray-700 w-10 text-right">{score}/100</span>
    </div>
  );
}

const PIE_COLORS = { AFC: '#22c55e', IFR: '#f59e0b', 'Not Started': '#94a3b8', CANCELLED: '#ef4444' };

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/dashboard').then(r => { setData(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"/></div>;
  if (!data) return <div className="text-center py-20 text-gray-400">Failed to load dashboard. Upload an MDR file to get started.</div>;

  const pieData = [
    { name: 'AFC', value: data.afc_count },
    { name: 'IFR', value: data.ifr_count },
    { name: 'Not Started', value: data.not_started_count },
  ].filter(d => d.value > 0);

  const trendData = data.snapshots.map(s => ({
    date: s.snapshot_date?.slice(5),
    pct: s.total_count > 0 ? Math.round((s.afc_count/s.total_count)*100) : 0,
    health: s.health_score
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><LayoutDashboard size={24}/> Portfolio Dashboard</h1>
          {data.lastUpdated && <p className="text-sm text-gray-400 mt-1">Last updated: {new Date(data.lastUpdated).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>}
        </div>
      </div>

      {data.total === 0 ? (
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-16 text-center">
          <LayoutDashboard className="mx-auto mb-4 text-gray-300" size={48}/>
          <h2 className="text-xl font-semibold text-gray-500 mb-2">No data yet</h2>
          <p className="text-gray-400">Upload an MDR Excel file to populate the dashboard.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Total Deliverables" value={data.total} icon={LayoutDashboard} color="sky"/>
            <MetricCard label="AFC (Complete)" value={`${data.afc_count} (${data.afc_pct}%)`} icon={CheckCircle} color="green"/>
            <MetricCard label="At Risk" value={data.at_risk_count} sub="due within 14 days" icon={AlertTriangle} color="amber"/>
            <MetricCard label="Overdue" value={data.late_count} sub="past due, not AFC" icon={XCircle} color="red"/>
          </div>

          <div className="bg-white rounded-xl border shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-gray-700">Portfolio Health Score</span>
              <span className={`text-sm font-bold px-2 py-1 rounded-full ${data.health_score >= 80 ? 'bg-green-100 text-green-700' : data.health_score >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                {data.health_score >= 80 ? 'Good' : data.health_score >= 60 ? 'Fair' : 'Critical'}
              </span>
            </div>
            <HealthBar score={data.health_score}/>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <h3 className="font-semibold text-gray-700 mb-4">Status Breakdown</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                    {pieData.map((entry) => <Cell key={entry.name} fill={PIE_COLORS[entry.name] || '#94a3b8'}/>)}
                  </Pie>
                  <Tooltip/>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <h3 className="font-semibold text-gray-700 mb-4">Completion Trend</h3>
              {trendData.length > 1 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                    <XAxis dataKey="date" tick={{ fontSize: 11 }}/>
                    <YAxis domain={[0,100]} tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`}/>
                    <Tooltip formatter={(v) => `${v}%`}/>
                    <Line type="monotone" dataKey="pct" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} name="AFC %"/>
                    <Line type="monotone" dataKey="health" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} name="Health"/>
                    <Legend/>
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Upload weekly to see trend data</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border shadow-sm">
            <div className="p-5 border-b">
              <h3 className="font-semibold text-gray-700">Projects at a Glance</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Project', 'Status', 'Health', 'AFC', 'IFR', 'Late'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.projects.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                      <td className="px-4 py-3"><StatusBadge status={p.overall_status} small/></td>
                      <td className="px-4 py-3 w-40">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${p.health_score >= 80 ? 'bg-green-500' : p.health_score >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${p.health_score}%` }}/>
                          </div>
                          <span className="text-xs text-gray-500 w-8">{p.health_score}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-green-600 font-medium">{p.afc}</td>
                      <td className="px-4 py-3 text-amber-600 font-medium">{p.ifr}</td>
                      <td className="px-4 py-3 text-red-600 font-medium">{p.late || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <AIPanel endpoint="/api/analyze/portfolio" title="AI Portfolio Summary"/>
        </>
      )}
    </div>
  );
}
