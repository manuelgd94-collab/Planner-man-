import { useState } from 'react';
import * as XLSX from 'xlsx';
import { clsx } from 'clsx';
import { FileSpreadsheet, Check, AlertCircle, Loader } from 'lucide-react';
import { setItem } from '../../store/localStorage';

// ── types ─────────────────────────────────────────────────────────────────────

interface ParsedTask   { texto: string; status: 'completada' | 'cancelada' | 'pendiente' }
interface ParsedDay    { fecha: string; dia: string; tareas: ParsedTask[] }
interface ParsedWeek   {
  semana: number; año: number; fechaInicio: string;
  objetivos: string[]; pendientes: string[]; emergencias: string[];
  dias: ParsedDay[]; notas: string[];
}

// ── constants ─────────────────────────────────────────────────────────────────

const MESES: Record<string, number> = {
  enero:1, febrero:2, marzo:3, abril:4, mayo:5, junio:6,
  julio:7, agosto:8, septiembre:9, octubre:10, noviembre:11, diciembre:12,
};
const DIAS_NOMBRE = ['lunes','martes','miércoles','jueves','viernes','sábado','domingo'];
const DONE_SET    = new Set(['✓','✔','v','si','sí','1','ok']);
const CANCEL_SET  = new Set(['✗','✘','×','x','no','0','n']);
const GOAL_COLORS = ['#6366f1','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4'];
const SCHEMA      = 'planner:v1';

// ── cell helpers ──────────────────────────────────────────────────────────────

function cellVal(rows: unknown[][], r: number, c: number): unknown {
  return rows[r]?.[c] ?? null;
}
function cellStr(rows: unknown[][], r: number, c: number): string {
  const v = cellVal(rows, r, c);
  return v == null ? '' : String(v).trim();
}
function parseStatus(raw: string): 'completada' | 'cancelada' | 'pendiente' {
  const s = raw.toLowerCase();
  if (DONE_SET.has(s))   return 'completada';
  if (CANCEL_SET.has(s)) return 'cancelada';
  return 'pendiente';
}

// ── date helpers ──────────────────────────────────────────────────────────────

function parseSpanishDate(txt: string): Date | null {
  const m = txt.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  return null;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ── sheet parser ──────────────────────────────────────────────────────────────

function parseSheet(ws: XLSX.WorkSheet, sheetName: string): ParsedWeek | null {
  // sheet_to_json with header:1 → 2D array (0-based row/col indices)
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });
  if (!rows.length) return null;

  // Week number: scan first 5 rows for "semana N", fallback to sheet name
  let weekNum = 0;
  for (let r = 0; r < Math.min(rows.length, 5) && !weekNum; r++) {
    for (const cell of rows[r] ?? []) {
      if (!cell) continue;
      const m = String(cell).match(/semana\s+(\d+)/i);
      if (m) { weekNum = parseInt(m[1]); break; }
    }
  }
  if (!weekNum) {
    const m = sheetName.match(/semana\s+(\d+)/i);
    if (m) weekNum = parseInt(m[1]);
  }
  if (!weekNum) return null;

  // Start date: scan all rows for any "DD-MM-YYYY" or "DD/MM/YYYY"
  let startDate: Date | null = null;
  for (let r = 0; r < Math.min(rows.length, 15) && !startDate; r++) {
    for (const cell of rows[r] ?? []) {
      if (!cell) continue;
      const d = parseSpanishDate(String(cell));
      if (d) { startDate = d; break; }
    }
  }
  if (!startDate) {
    // Fallback: compute Monday of ISO week weekNum
    const now = new Date();
    const jan4 = new Date(now.getFullYear(), 0, 4);
    startDate = new Date(jan4.getTime() + (weekNum - 1) * 7 * 86400000);
    startDate.setDate(startDate.getDate() - ((startDate.getDay() + 6) % 7));
  }

  // Locate section header columns (Objetivos, Pendientes, Emergencias)
  // Search entire sheet up to row 20
  let objCol = -1, pendCol = -1, emergCol = -1;
  let sectionHeaderRow = -1;
  for (let r = 0; r < Math.min(rows.length, 20); r++) {
    let found = false;
    for (let c = 0; c < (rows[r]?.length ?? 0); c++) {
      const txt = cellStr(rows, r, c).toLowerCase();
      if (txt.includes('objetivo') && objCol < 0)   { objCol = c; found = true; }
      if (txt.includes('pendiente') && pendCol < 0)  { pendCol = c; found = true; }
      if (txt.includes('emergencia') && emergCol < 0) { emergCol = c; found = true; }
    }
    if (found && sectionHeaderRow < 0) sectionHeaderRow = r;
  }
  if (objCol < 0) objCol = 2; // last resort default

  // Extract the three sections (rows after section header, until day-header area)
  const objetivos: string[]   = [];
  const pendientes: string[]  = [];
  const emergencias: string[] = [];
  const sectStart = sectionHeaderRow >= 0 ? sectionHeaderRow + 1 : 3;
  for (let r = sectStart; r < Math.min(sectStart + 20, rows.length); r++) {
    const o = cellStr(rows, r, objCol);
    const p = pendCol  >= 0 ? cellStr(rows, r, pendCol)  : '';
    const e = emergCol >= 0 ? cellStr(rows, r, emergCol) : '';
    if (o) objetivos.push(o);
    if (p) pendientes.push(p);
    if (e) emergencias.push(e);
  }

  // Find day-header row: the row with the most integer values in 1-31
  // Search the whole sheet
  let dayRow = -1, bestCount = 0;
  for (let r = 0; r < rows.length; r++) {
    let count = 0;
    for (const cell of rows[r] ?? []) {
      if (cell === null || cell === undefined) continue;
      if (typeof cell === 'number' && Number.isInteger(cell) && cell >= 1 && cell <= 31) count++;
      else if (typeof cell === 'string' && /^\s*\d{1,2}\s*$/.test(cell)) {
        const n = parseInt(cell.trim());
        if (n >= 1 && n <= 31) count++;
      }
    }
    if (count > bestCount) { bestCount = count; dayRow = r; }
  }
  if (dayRow < 0 || bestCount < 2) return null;

  // Build day-column list from the day-header row
  interface DayCol { col: number; fecha: Date; dia: string }
  const dayCols: DayCol[] = [];

  for (let c = 0; c < (rows[dayRow]?.length ?? 0); c++) {
    const v = cellVal(rows, dayRow, c);
    let dayNum = 0;
    if (typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 31) dayNum = v;
    else if (typeof v === 'string' && /^\s*\d{1,2}\s*$/.test(v)) {
      const n = parseInt(v.trim());
      if (n >= 1 && n <= 31) dayNum = n;
    }
    if (!dayNum) continue;

    // Find month name in adjacent rows (check up to 4 rows below)
    let monthNum = 0;
    for (let delta = 1; delta <= 4; delta++) {
      const below = cellStr(rows, dayRow + delta, c).toLowerCase().trim();
      if (MESES[below]) { monthNum = MESES[below]; break; }
      // Also try partial match (e.g. "abr" for "abril")
      for (const [mes, num] of Object.entries(MESES)) {
        if (below.startsWith(mes.slice(0, 3))) { monthNum = num; break; }
      }
      if (monthNum) break;
    }

    // Compute date
    let fecha: Date;
    if (monthNum) {
      try {
        fecha = new Date(startDate.getFullYear(), monthNum - 1, dayNum);
      } catch { fecha = startDate; }
    } else {
      // Find within ±10 days of startDate
      fecha = startDate;
      for (let off = -3; off <= 10; off++) {
        const cand = addDays(startDate, off);
        if (cand.getDate() === dayNum) { fecha = cand; break; }
      }
    }

    dayCols.push({
      col: c,
      fecha,
      dia: DIAS_NOMBRE[fecha.getDay() === 0 ? 6 : fecha.getDay() - 1],
    });
  }
  if (!dayCols.length) return null;

  // Extract tasks per day (rows dayRow+2 … dayRow+40)
  const taskStart = dayRow + 2;
  const taskEnd   = Math.min(taskStart + 40, rows.length - 1);

  const dias: ParsedDay[] = dayCols.map(({ col, fecha, dia }) => {
    const tareas: ParsedTask[] = [];
    for (let r = taskStart; r <= taskEnd; r++) {
      const desc = cellStr(rows, r, col + 1);
      if (!desc) continue;
      const rawSt = cellStr(rows, r, col);
      tareas.push({ texto: desc, status: parseStatus(rawSt) });
    }
    return { fecha: toISO(fecha), dia, tareas };
  });

  // Notes: find "Notas" header after task block, then collect from objCol
  let notesStart = taskEnd + 3;
  for (let r = taskEnd; r < Math.min(taskEnd + 20, rows.length); r++) {
    for (let c = 0; c < (rows[r]?.length ?? 0); c++) {
      if (cellStr(rows, r, c).toLowerCase().includes('nota')) {
        notesStart = r + 1; break;
      }
    }
  }
  const notas: string[] = [];
  for (let r = notesStart; r < Math.min(notesStart + 12, rows.length); r++) {
    const n = cellStr(rows, r, objCol);
    if (n) notas.push(n);
  }

  return {
    semana: weekNum,
    año: startDate.getFullYear(),
    fechaInicio: toISO(startDate),
    objetivos, pendientes, emergencias, dias, notas,
  };
}

// ── planner JSON builder ──────────────────────────────────────────────────────

function newId()    { return crypto.randomUUID(); }
function nowISO()   { return new Date().toISOString(); }

function weekToStorage(week: ParsedWeek): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const yearMonth = week.fechaInicio.slice(0, 7);

  // Daily plans
  week.dias.forEach((day, i) => {
    const key = `${SCHEMA}:daily:${day.fecha}`;

    type TaskRec = { id: string; title: string; priority: 'alta'|'media'|'baja'; status: string; dueDate: string; tags: string[]; createdAt: string; updatedAt: string; completedAt?: string };
    const tasks: TaskRec[] = day.tareas.map(t => ({
      id: newId(), title: t.texto, priority: 'media' as const,
      status: t.status, dueDate: day.fecha, tags: [],
      ...(t.status === 'completada' ? { completedAt: nowISO() } : {}),
      createdAt: nowISO(), updatedAt: nowISO(),
    }));

    // Pendientes + Emergencias on first day
    if (i === 0) {
      week.pendientes.forEach(txt => tasks.push({
        id: newId(), title: txt, priority: 'media', status: 'pendiente',
        dueDate: day.fecha, tags: [], createdAt: nowISO(), updatedAt: nowISO(),
      }));
      week.emergencias.forEach(txt => tasks.push({
        id: newId(), title: txt, priority: 'alta', status: 'pendiente',
        dueDate: day.fecha, tags: [], createdAt: nowISO(), updatedAt: nowISO(),
      }));
    }

    const dailyPlan: Record<string, unknown> = {
      date: day.fecha, tasks, habitEntries: [],
    };

    // Notes on first day
    if (i === 0 && week.notas.length > 0) {
      dailyPlan.note = {
        id: newId(), scopeType: 'daily', scopeKey: day.fecha,
        blocks: week.notas.map((n, j) => ({
          id: newId(), type: 'paragraph', content: n, order: j,
        })),
        updatedAt: nowISO(),
      };
    }

    out[key] = dailyPlan;
  });

  // Monthly goals
  if (week.objetivos.length > 0) {
    const mKey = `${SCHEMA}:monthly:${yearMonth}`;
    const [year, month] = yearMonth.split('-').map(Number);
    const goals = week.objetivos.map((title, idx) => ({
      id: newId(), title, status: 'no_iniciada', scope: 'mensual',
      year, month, progress: 0, category: 'Trabajo',
      color: GOAL_COLORS[idx % GOAL_COLORS.length],
      createdAt: nowISO(), updatedAt: nowISO(),
    }));
    out[mKey] = { yearMonth, goals };
  }

  return out;
}

// ── component ─────────────────────────────────────────────────────────────────

type Status = 'idle' | 'loading' | 'preview' | 'success' | 'error';

interface Preview {
  weeks: ParsedWeek[];
  storage: Record<string, unknown>;
}

export function ExcelImport() {
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setStatus('loading');
    setMessage('');

    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = new Uint8Array(ev.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });

        const targetSheets = wb.SheetNames.filter(s =>
          /planificador\s+horario\s+semana/i.test(s)
        );

        if (!targetSheets.length) {
          setStatus('error');
          setMessage(`No se encontraron hojas "Planificador horario semana N". Hojas en el archivo: ${wb.SheetNames.join(', ')}`);
          return;
        }

        const weeks: ParsedWeek[] = [];
        for (const name of targetSheets) {
          const parsed = parseSheet(wb.Sheets[name], name);
          if (parsed) weeks.push(parsed);
        }

        if (!weeks.length) {
          setStatus('error');
          setMessage('No se pudo extraer datos de ninguna hoja. Verificá que el formato coincida.');
          return;
        }

        // Merge all weeks into one storage object
        const storage: Record<string, unknown> = {};
        for (const w of weeks) {
          Object.assign(storage, weekToStorage(w));
        }

        setPreview({ weeks, storage });
        setStatus('preview');
      } catch (err) {
        setStatus('error');
        setMessage(`Error leyendo el archivo: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function handleConfirm() {
    if (!preview) return;
    for (const [key, value] of Object.entries(preview.storage)) {
      setItem(key, value);
    }
    setStatus('success');
    setMessage(`${preview.weeks.length} semana(s) importadas. Recargá la página (F5) para ver los cambios.`);
    setPreview(null);
  }

  function handleCancel() {
    setStatus('idle');
    setPreview(null);
    setMessage('');
  }

  const totalTasks = preview?.weeks.reduce(
    (s, w) => s + w.dias.reduce((sd, d) => sd + d.tareas.length, 0) + w.pendientes.length + w.emergencias.length, 0
  ) ?? 0;
  const totalGoals = preview?.weeks.reduce((s, w) => s + w.objetivos.length, 0) ?? 0;

  return (
    <div className="space-y-2">
      {status !== 'preview' && (
        <label className={clsx(
          'flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-border',
          'bg-white hover:bg-surface-tertiary transition-colors text-text-secondary cursor-pointer',
          status === 'loading' && 'opacity-50 pointer-events-none'
        )}>
          {status === 'loading'
            ? <Loader size={12} className="animate-spin" />
            : <FileSpreadsheet size={12} />}
          Importar Excel
          <input type="file" accept=".xlsx,.xls,.ods" className="hidden" onChange={handleFile} />
        </label>
      )}

      {status === 'preview' && preview && (
        <div className="border border-border rounded-lg bg-white p-3 space-y-2.5 text-xs">
          <p className="font-semibold text-text-primary">Vista previa</p>
          <div className="space-y-1">
            {preview.weeks.map(w => (
              <div key={w.semana} className="text-text-secondary">
                <span className="font-medium text-text-primary">Semana {w.semana}</span>
                {' '}({w.fechaInicio})
                {' · '}{w.dias.reduce((s,d) => s+d.tareas.length, 0)} tareas
                {w.objetivos.length > 0 && ` · ${w.objetivos.length} objetivos`}
                {w.notas.length > 0 && ` · ${w.notas.length} notas`}
              </div>
            ))}
          </div>
          <p className="text-text-muted">
            Total: {totalTasks} tareas · {totalGoals} objetivos en {Object.keys(preview.storage).length} claves
          </p>
          <div className="flex gap-1.5 pt-1">
            <button
              onClick={handleConfirm}
              className="flex-1 bg-gray-900 text-white rounded-lg py-1.5 font-medium hover:bg-gray-700 transition-colors"
            >
              Confirmar importación
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 border border-border rounded-lg py-1.5 text-text-secondary hover:bg-surface-tertiary transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {(status === 'success' || status === 'error') && (
        <div className={clsx(
          'flex items-start gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg',
          status === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        )}>
          {status === 'success' ? <Check size={11} className="mt-0.5 flex-shrink-0" /> : <AlertCircle size={11} className="mt-0.5 flex-shrink-0" />}
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}
