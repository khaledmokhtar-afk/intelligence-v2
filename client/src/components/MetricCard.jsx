import React from 'react';

export default function MetricCard({ label, value, sub, color = 'sky', icon: Icon }) {
  const colors = {
    sky:   'from-sky-500 to-sky-600',
    green: 'from-green-500 to-green-600',
    amber: 'from-amber-500 to-amber-600',
    red:   'from-red-500 to-red-600',
    gray:  'from-gray-500 to-gray-600',
  };
  return (
    <div className="bg-white rounded-xl border shadow-sm p-5 flex items-start gap-4">
      {Icon && (
        <div className={`bg-gradient-to-br ${colors[color]} rounded-xl p-3 text-white shrink-0`}>
          <Icon size={22}/>
        </div>
      )}
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm font-medium text-gray-600">{label}</div>
        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}
