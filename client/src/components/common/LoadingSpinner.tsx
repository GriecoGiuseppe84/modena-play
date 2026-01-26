import React from 'react';

export default function LoadingSpinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-slate-200">
      <div className="h-5 w-5 rounded-full border-2 border-slate-600 border-t-slate-200 animate-spin" />
      <span className="text-sm">{label ?? 'Caricamento...'}</span>
    </div>
  );
}
