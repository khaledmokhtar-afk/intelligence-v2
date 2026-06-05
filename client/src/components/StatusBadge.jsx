import React from 'react';

const CONFIG = {
  AFC:         { bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-200',  label: 'AFC ✓' },
  IFR:         { bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'border-amber-200',  label: 'IFR' },
  NOT_STARTED: { bg: 'bg-gray-100',   text: 'text-gray-600',   border: 'border-gray-200',   label: 'Not Started' },
  CANCELLED:   { bg: 'bg-red-50',     text: 'text-red-500',    border: 'border-red-200',    label: 'Cancelled' },
  ON_TRACK:    { bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-200',  label: 'On Track' },
  AT_RISK:     { bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'border-amber-200',  label: 'At Risk' },
  LATE:        { bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-200',    label: 'Late' },
  COMPLETED:   { bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-200',   label: 'Completed' },
};

export default function StatusBadge({ status, small }) {
  const cfg = CONFIG[status] || CONFIG.NOT_STARTED;
  return (
    <span className={`inline-flex items-center rounded-full border font-medium ${cfg.bg} ${cfg.text} ${cfg.border} ${small ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1'}`}>
      {cfg.label}
    </span>
  );
}
