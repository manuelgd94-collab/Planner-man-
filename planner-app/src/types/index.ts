export type Priority = 'alta' | 'media' | 'baja';
export type TaskStatus = 'pendiente' | 'en_progreso' | 'completada' | 'cancelada';

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  status: TaskStatus;
  dueDate: string;
  completedAt?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
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

export interface DailyPlan {
  date: string;
  tasks: Task[];
  habitEntries: HabitEntry[];
  note?: Note;
  mood?: 1 | 2 | 3 | 4 | 5;
}

export interface MonthlyPlan {
  yearMonth: string;
  goals: Goal[];
  note?: Note;
}

export interface AnnualPlan {
  year: number;
  goals: Goal[];
}

export type ViewType = 'diario' | 'mensual' | 'anual';

export interface AppSettings {
  sidebarCollapsed: boolean;
}
