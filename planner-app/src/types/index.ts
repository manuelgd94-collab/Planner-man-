export type Priority = 'alta' | 'media' | 'baja';
export type TaskStatus = 'pendiente' | 'en_progreso' | 'completada' | 'cancelada' | 'reprogramada';
export type RecurrenceRule = 'diaria' | 'semanal' | 'mensual';

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  status: TaskStatus;
  dueDate: string;
  completedAt?: string;
  tags: string[];
  startTime?: string; // "HH:MM" e.g. "09:00"
  rescheduledFrom?: string; // ISO date of original day if task was moved from another day
  unplanned?: boolean; // true if task was not in the original plan (added ad-hoc during the day)
  recurrenceRule?: RecurrenceRule;
  templateId?: string; // links to RecurringTemplate
  goalId?: string;     // links to Goal for automatic progress update
  createdAt: string;
  updatedAt: string;
}

export interface RecurringTemplate {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  tags: string[];
  startTime?: string;
  recurrenceRule: RecurrenceRule;
  dayOfWeek?: number; // 0=Mon..6=Sun, for 'semanal'
  dayOfMonth?: number; // 1-31, for 'mensual'
  createdAt: string;
  archivedAt?: string;
}

export type HabitFrequency = 'diaria' | 'semanal';

export interface Habit {
  id: string;
  name: string;
  icon?: string;
  frequency: HabitFrequency;
  color: string;
  createdAt: string;
  archivedAt?: string;
}

export interface HabitEntry {
  id: string;
  habitId: string;
  date: string;
  completed: boolean;
  note?: string;
}

export type BlockType = 'paragraph' | 'heading1' | 'heading2' | 'bullet' | 'divider';

export interface NoteBlock {
  id: string;
  type: BlockType;
  content: string;
  order: number;
}

export interface Note {
  id: string;
  scopeType: 'daily' | 'monthly';
  scopeKey: string;
  blocks: NoteBlock[];
  updatedAt: string;
}

export type GoalStatus = 'no_iniciada' | 'en_progreso' | 'completada' | 'abandonada';
export type GoalScope = 'mensual' | 'anual';
export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';

export interface Goal {
  id: string;
  title: string;
  description?: string;
  status: GoalStatus;
  scope: GoalScope;
  year: number;
  quarter?: Quarter;
  month?: number;
  progress: number;
  category?: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyItem {
  id: string;
  title: string;
  completed: boolean;
  carriedOver?: boolean; // true if carried from the previous week
  createdAt: string;
}

export interface WeeklyPlan {
  weekStart: string;           // ISO date of Thursday
  goals: Goal[];               // weekly objectives with progress tracking
  pendientes: WeeklyItem[];    // obligations that carry over if unfinished
  emergencias: WeeklyItem[];   // urgent issues that arise during the shift
  retrospectiva?: {
    logros: string;
    mejoras: string;
    aprendizajes: string;
  };
}

export interface DailyPlan {
  date: string;
  tasks: Task[];
  habitEntries: HabitEntry[];
  note?: Note;
  mood?: 1 | 2 | 3 | 4 | 5;
}

export type MilestoneType = 'entrega' | 'inspeccion' | 'reunion' | 'cierre' | 'otro';

export interface Milestone {
  id: string;
  date: string;
  title: string;
  type: MilestoneType;
}

export interface MonthlyPlan {
  yearMonth: string;
  goals: Goal[];
  note?: Note;
  milestones?: Milestone[];
}

export interface AnnualPlan {
  year: number;
  goals: Goal[];
}

export type ViewType = 'diario' | 'semanal' | 'mensual' | 'anual' | 'historial' | 'estadisticas';

export interface AppSettings {
  sidebarCollapsed: boolean;
}

export type { HistoryEntry } from './history';
