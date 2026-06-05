import React, { useEffect, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';
import StatusBadge from '../components/StatusBadge';

function fmt(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }
function dayName(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-GB', { weekday: 'short' }); }

export default function ThisWeek() {
  const [data, setData] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(true);

  const getDate = (offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset * 7);
    return d.toISOString().split('T')[0];
  };

  useEffect(() => {
    setLoading(true);
    axios.get(`/api/weekly?date=${getDate(weekOffset)}`)
      .then(r => { setData(r.data); setLoading(false); });
  }, [weekOffset]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"/></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Calendar size={24}/> Weekly View</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => setWeekOffset(o => o-1)} className="p-2 rounded-lg hover:bg-gray-100"><ChevronLeft size={18}/></button>
          <span className="text-sm font-medium text-gray-600">
            {data ? `${fmt(data.weekStart)} – ${fmt(data.weekEnd)}` : ''}
          </span>
          <button onClick={() => setWeekOffset(o => o+1)} className="p-2 rounded-lg hover:bg-gray-100"><ChevronRight size={18}/></button>
          {weekOffset !== 0 && <button onClick={() => setWeekOffset(0)} className="text-xs text-sky-600 hover:underline">Today</button>}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 flex items-center gap-3">
          <div className="text-3xl font-bold text-sky-700">{data?.dueThisWeek?.length ?? 0}</div>
          <div className="text-sm text-sky-600">Due this week (not AFC)</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <div className="text-3xl font-bold text-red-700">{data?.carryOver?.length ?? 0}</div>
          <div className="text-sm text-red-600">Carry-over (overdue)</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm">
        <div className="p-4 border-b font-semibold text-gray-700">Due This Week</div>
        {data?.dueThisWeek?.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Nothing due this week</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>{['#','Doc No','Title','Phase','Discipline','Due','Status'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y">
                {data.dueThisWeek.map((d, i) => (
                  <tr key={d.id} className={`hover:bg-gray-50 ${d.status === 'NOT_STARTED' ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-3 text-gray-400">{i+1}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{d.id}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{d.title}</td>
                    <td className="px-4 py-3 text-gray-500">{d.phase || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{d.discipline || '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{dayName(d.planned_end)} {fmt(d.planned_end)}</td>
                    <td className="px-4 py-3"><StatusBadge status={d.status} small/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data?.carryOver?.length > 0 && (
        <div className="bg-white rounded-xl border shadow-sm">
          <div className="p-4 border-b font-semibold text-red-700 flex items-center gap-2">
            <span className="bg-red-100 text-red-700 rounded-full px-2 py-0.5 text-xs">{data.carryOver.length}</span>
            Carry-over — Overdue Items
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>{['Doc No','Title','Discipline','Was Due','Days Late','Status'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y">
                {data.carryOver.map(d => (
                  <tr key={d.id} className="hover:bg-red-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{d.id}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{d.title}</td>
                    <td className="px-4 py-3 text-gray-500">{d.discipline || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{fmt(d.planned_end)}</td>
                    <td className="px-4 py-3"><span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full">{d.days_late}d late</span></td>
                    <td className="px-4 py-3"><StatusBadge status={d.status} small/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
