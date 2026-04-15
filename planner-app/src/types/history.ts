export interface HistoryEntry {
  id: string;
  timestamp: string;
  action: string;
  detail: string;
  category: 'tarea' | 'habito' | 'objetivo' | 'nota' | 'estado';
}
