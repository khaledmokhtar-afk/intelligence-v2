import React, { useEffect, useState } from 'react';
import { Users, Search } from 'lucide-react';
import axios from 'axios';
import StatusBadge from '../components/StatusBadge';

function fmt(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }

const RACI_COLORS = {
  RESPONSIBLE: 'bg-sky-100 text-sky-700',
  ACCOUNTABLE: 'bg-purple-100 text-purple-700',
  CONSULTED:   'bg-gray-100 text-gray-600',
  INFORMED:    'bg-green-100 text-green-700',
};

export default function ResponsibilityMatrix() {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/matrix').then(r => { setData(r.data); setLoading(false); });
  }, []);

  const filtered = data?.owners?.filter(o =>
    !search || o.name.toLowerCase().includes(search.toLowerCase()) || o.team?.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"/></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Users size={24}/> Responsibility Matrix</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
          <input
            className="pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 w-60"
            placeholder="Search by person or team..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-16 text-center">
          <Users className="mx-auto mb-4 text-gray-300" size={48}/>
          <h2 className="text-xl font-semibold text-gray-500 mb-2">No assignees found</h2>
          <p className="text-gray-400">Upload an MDR with an Owner column, or add assignees manually.</p>
        </div>
      )}

      <div className="space-y-4">
        {filtered.map(owner => (
          <div key={owner.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="p-4 bg-gray-50 border-b flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{owner.name}</h3>
                <p className="text-sm text-gray-500">{[owner.role, owner.team].filter(Boolean).join(' · ')}</p>
              </div>
              <div className="flex gap-3 text-sm">
                <span className="bg-sky-100 text-sky-700 px-2 py-1 rounded-full text-xs font-medium">{owner.stats.active} active</span>
                {owner.stats.overdue > 0 && <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium">{owner.stats.overdue} overdue</span>}
                {owner.stats.due_soon > 0 && <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-xs font-medium">{owner.stats.due_soon} due soon</span>}
              </div>
            </div>
            {owner.assignments.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-white">
                    <tr>{['Doc No','Title','Project','Phase','Role','Due Date','Status'].map(h => <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-gray-500">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {owner.assignments.map(a => a.deliverable && (
                      <tr key={a.deliverable_id} className={`hover:bg-gray-50 ${a.is_overdue ? 'bg-red-50/50' : ''}`}>
                        <td className="px-4 py-2 font-mono text-xs text-gray-500">{a.deliverable.id}</td>
                        <td className="px-4 py-2 font-medium text-gray-900">{a.deliverable.title}</td>
                        <td className="px-4 py-2 text-gray-500">{a.deliverable.project_id}</td>
                        <td className="px-4 py-2 text-gray-500">{a.deliverable.phase || '—'}</td>
                        <td className="px-4 py-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RACI_COLORS[a.role_on_deliverable] || 'bg-gray-100 text-gray-600'}`}>{a.role_on_deliverable?.[0] || 'R'}</span>
                        </td>
                        <td className="px-4 py-2 text-gray-600">{fmt(a.effective_due)}</td>
                        <td className="px-4 py-2"><StatusBadge status={a.deliverable.status} small/></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
