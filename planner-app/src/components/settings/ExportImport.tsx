import { useState } from 'react';
import { Download, Upload, Check, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { listKeys, getItem, setItem } from '../../store/localStorage';

export function ExportImport() {
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  function handleExport() {
    const allKeys = listKeys('planner:');
    const data: Record<string, unknown> = {};
    for (const key of allKeys) {
      data[key] = getItem(key);
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `planificador-backup-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
    flash('success', 'Datos exportados correctamente');
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target?.result as string) as Record<string, unknown>;
        for (const [key, value] of Object.entries(data)) {
          if (key.startsWith('planner:')) setItem(key, value);
        }
        flash('success', 'Importado. Recarga la página para ver los cambios.');
      } catch {
        flash('error', 'Archivo no válido.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function flash(type: 'success' | 'error', msg: string) {
    setStatus(type);
    setMessage(msg);
    setTimeout(() => setStatus('idle'), 4000);
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-border bg-white hover:bg-surface-tertiary transition-colors text-text-secondary"
        >
          <Download size={12} />
          Exportar
        </button>
        <label className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-border bg-white hover:bg-surface-tertiary transition-colors text-text-secondary cursor-pointer">
          <Upload size={12} />
          Importar
          <input type="file" accept=".json" className="hidden" onChange={handleImport} />
        </label>
      </div>

      {status !== 'idle' && (
        <div className={clsx(
          'flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg',
          status === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        )}>
          {status === 'success' ? <Check size={11} /> : <AlertCircle size={11} />}
          {message}
        </div>
      )}
    </div>
  );
}
