import { createContext, useContext, useReducer, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type {
  Task, Habit, HabitEntry, Goal, DailyPlan, MonthlyPlan, AnnualPlan,
  Note, NoteBlock, ViewType, AppSettings, RecurringTemplate,
} from '../types';
import { getItem, setItem, KEYS } from './localStorage';
import { toISODate, toYearMonth } from '../utils/dateUtils';
import { addHistoryEntry } from './historyLog';
import { isLocked, hasPin } from './auth';
import { getTemplates, saveTemplates, templateAppliesTo, taskFromTemplate } from './recurringTasks';

interface AppState {
  view: ViewType;
  selectedDate: Date;
  habits: Habit[];
  habitEntries: HabitEntry[];
  recurringTemplates: RecurringTemplate[];
  dailyPlan: DailyPlan | null;
  monthlyPlan: MonthlyPlan | null;
  annualPlan: AnnualPlan | null;
  settings: AppSettings;
  locked: boolean;
}

type Action =
  | { type: 'SET_VIEW'; view: ViewType }
  | { type: 'SET_DATE'; date: Date }
  | { type: 'LOAD_DAILY'; plan: DailyPlan }
  | { type: 'LOAD_MONTHLY'; plan: MonthlyPlan }
  | { type: 'LOAD_ANNUAL'; plan: AnnualPlan }
  | { type: 'ADD_TASK'; task: Task }
  | { type: 'UPDATE_TASK'; task: Task }
  | { type: 'DELETE_TASK'; taskId: string }
  | { type: 'TOGGLE_TASK'; taskId: string }
  | { type: 'ADD_HABIT'; habit: Habit }
  | { type: 'UPDATE_HABIT'; habit: Habit }
  | { type: 'DELETE_HABIT'; habitId: string }
  | { type: 'TOGGLE_HABIT_ENTRY'; habitId: string; date: string }
  | { type: 'SET_HABITS'; habits: Habit[]; entries: HabitEntry[] }
  | { type: 'ADD_GOAL'; goal: Goal }
  | { type: 'UPDATE_GOAL'; goal: Goal }
  | { type: 'DELETE_GOAL'; goalId: string; scope: 'monthly' | 'annual' }
  | { type: 'UPDATE_DAILY_NOTE'; note: Note }
  | { type: 'UPDATE_MONTHLY_NOTE'; note: Note }
  | { type: 'SET_MOOD'; mood: 1 | 2 | 3 | 4 | 5 }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_LOCKED'; locked: boolean }
  | { type: 'ADD_RECURRING'; template: RecurringTemplate }
  | { type: 'DELETE_RECURRING'; templateId: string }
  | { type: 'SET_RECURRING'; templates: RecurringTemplate[] };

function initialDailyPlan(date: string): DailyPlan {
  return { date, tasks: [], habitEntries: [] };
}

function initialMonthlyPlan(yearMonth: string): MonthlyPlan {
  return { yearMonth, goals: [] };
}

function initialAnnualPlan(year: number): AnnualPlan {
  return { year, goals: [] };
}

function now(): string {
  return new Date().toISOString();
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_VIEW':
      return { ...state, view: action.view };

    case 'SET_DATE':
      return { ...state, selectedDate: action.date };

    case 'LOAD_DAILY':
      return { ...state, dailyPlan: action.plan };

    case 'LOAD_MONTHLY':
      return { ...state, monthlyPlan: action.plan };

    case 'LOAD_ANNUAL':
      return { ...state, annualPlan: action.plan };

    case 'ADD_TASK': {
      const plan = state.dailyPlan ?? initialDailyPlan(toISODate(state.selectedDate));
      return { ...state, dailyPlan: { ...plan, tasks: [...plan.tasks, action.task] } };
    }

    case 'UPDATE_TASK': {
      const plan = state.dailyPlan ?? initialDailyPlan(toISODate(state.selectedDate));
      return {
        ...state,
        dailyPlan: {
          ...plan,
          tasks: plan.tasks.map(t => t.id === action.task.id ? action.task : t),
        },
      };
    }

    case 'DELETE_TASK': {
      const plan = state.dailyPlan ?? initialDailyPlan(toISODate(state.selectedDate));
      return {
        ...state,
        dailyPlan: { ...plan, tasks: plan.tasks.filter(t => t.id !== action.taskId) },
      };
    }

    case 'TOGGLE_TASK': {
      const plan = state.dailyPlan ?? initialDailyPlan(toISODate(state.selectedDate));
      return {
        ...state,
        dailyPlan: {
          ...plan,
          tasks: plan.tasks.map(t => {
            if (t.id !== action.taskId) return t;
            const isCompleted = t.status === 'completada';
            return {
              ...t,
              status: isCompleted ? 'pendiente' : 'completada',
              completedAt: isCompleted ? undefined : now(),
              updatedAt: now(),
            };
          }),
        },
      };
    }

    case 'SET_HABITS':
      return { ...state, habits: action.habits, habitEntries: action.entries };

    case 'ADD_HABIT':
      return { ...state, habits: [...state.habits, action.habit] };

    case 'UPDATE_HABIT':
      return { ...state, habits: state.habits.map(h => h.id === action.habit.id ? action.habit : h) };

    case 'DELETE_HABIT':
      return { ...state, habits: state.habits.filter(h => h.id !== action.habitId) };

    case 'TOGGLE_HABIT_ENTRY': {
      const { habitId, date } = action;
      const existing = state.habitEntries.find(e => e.habitId === habitId && e.date === date);
      const newEntry: HabitEntry = existing
        ? { ...existing, completed: !existing.completed }
        : { id: crypto.randomUUID(), habitId, date, completed: true };

      const entries = existing
        ? state.habitEntries.map(e => (e.habitId === habitId && e.date === date) ? newEntry : e)
        : [...state.habitEntries, newEntry];

      // Also sync into dailyPlan when the toggled date matches the currently loaded day
      // so the dailyPlan persist effect saves the entry to localStorage
      let dailyPlan = state.dailyPlan;
      if (dailyPlan?.date === date) {
        const planEntries = dailyPlan.habitEntries ?? [];
        const planExisting = planEntries.find(e => e.habitId === habitId);
        dailyPlan = {
          ...dailyPlan,
          habitEntries: planExisting
            ? planEntries.map(e => e.habitId === habitId ? newEntry : e)
            : [...planEntries, newEntry],
        };
      }

      return { ...state, habitEntries: entries, dailyPlan };
    }

    case 'ADD_GOAL': {
      if (action.goal.scope === 'mensual') {
        const plan = state.monthlyPlan ?? initialMonthlyPlan(toYearMonth(state.selectedDate));
        return { ...state, monthlyPlan: { ...plan, goals: [...plan.goals, action.goal] } };
      } else {
        const plan = state.annualPlan ?? initialAnnualPlan(state.selectedDate.getFullYear());
        return { ...state, annualPlan: { ...plan, goals: [...plan.goals, action.goal] } };
      }
    }

    case 'UPDATE_GOAL': {
      if (action.goal.scope === 'mensual') {
        const plan = state.monthlyPlan ?? initialMonthlyPlan(toYearMonth(state.selectedDate));
        return {
          ...state,
          monthlyPlan: { ...plan, goals: plan.goals.map(g => g.id === action.goal.id ? action.goal : g) },
        };
      } else {
        const plan = state.annualPlan ?? initialAnnualPlan(state.selectedDate.getFullYear());
        return {
          ...state,
          annualPlan: { ...plan, goals: plan.goals.map(g => g.id === action.goal.id ? action.goal : g) },
        };
      }
    }

    case 'DELETE_GOAL': {
      if (action.scope === 'monthly') {
        const plan = state.monthlyPlan ?? initialMonthlyPlan(toYearMonth(state.selectedDate));
        return {
          ...state,
          monthlyPlan: { ...plan, goals: plan.goals.filter(g => g.id !== action.goalId) },
        };
      } else {
        const plan = state.annualPlan ?? initialAnnualPlan(state.selectedDate.getFullYear());
        return {
          ...state,
          annualPlan: { ...plan, goals: plan.goals.filter(g => g.id !== action.goalId) },
        };
      }
    }

    case 'UPDATE_DAILY_NOTE': {
      const plan = state.dailyPlan ?? initialDailyPlan(toISODate(state.selectedDate));
      return { ...state, dailyPlan: { ...plan, note: action.note } };
    }

    case 'UPDATE_MONTHLY_NOTE': {
      const plan = state.monthlyPlan ?? initialMonthlyPlan(toYearMonth(state.selectedDate));
      return { ...state, monthlyPlan: { ...plan, note: action.note } };
    }

    case 'SET_MOOD': {
      const plan = state.dailyPlan ?? initialDailyPlan(toISODate(state.selectedDate));
      return { ...state, dailyPlan: { ...plan, mood: action.mood } };
    }

    case 'TOGGLE_SIDEBAR':
      return {
        ...state,
        settings: { ...state.settings, sidebarCollapsed: !state.settings.sidebarCollapsed },
      };

    case 'SET_LOCKED':
      return { ...state, locked: action.locked };

    case 'SET_RECURRING':
      return { ...state, recurringTemplates: action.templates };

    case 'ADD_RECURRING':
      return { ...state, recurringTemplates: [...state.recurringTemplates, action.template] };

    case 'DELETE_RECURRING':
      return { ...state, recurringTemplates: state.recurringTemplates.filter(t => t.id !== action.templateId) };

    default:
      return state;
  }
}

interface PlannerContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  isReadOnly: boolean;
  addRecurringTemplate: (t: Omit<RecurringTemplate, 'id' | 'createdAt'>) => void;
  deleteRecurringTemplate: (id: string) => void;
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTask: (task: Task) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string) => void;
  addHabit: (habit: Omit<Habit, 'id' | 'createdAt'>) => void;
  deleteHabit: (id: string) => void;
  toggleHabitEntry: (habitId: string, date: string) => void;
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateGoal: (goal: Goal) => void;
  deleteGoal: (goalId: string, scope: 'monthly' | 'annual') => void;
  updateDailyNote: (blocks: NoteBlock[], scopeKey: string) => void;
  updateMonthlyNote: (blocks: NoteBlock[], scopeKey: string) => void;
  setMood: (mood: 1 | 2 | 3 | 4 | 5) => void;
}

const PlannerContext = createContext<PlannerContextValue | null>(null);

const defaultSettings: AppSettings = { sidebarCollapsed: false };

export function PlannerProvider({ children }: { children: ReactNode }) {
  const today = new Date();
  // Always start locked unless this browser has explicitly unlocked before.
  // isLocked() returns true by default (when key is absent), so:
  //   - Owner's browser (unlocked recently): false → editable immediately
  //   - Any other browser (no key): true → read-only until PIN is entered or "view only" chosen
  const initialLocked = isLocked();

  const [state, dispatch] = useReducer(reducer, {
    view: 'diario',
    selectedDate: today,
    habits: [],
    habitEntries: [],
    recurringTemplates: [],
    dailyPlan: null,
    monthlyPlan: null,
    annualPlan: null,
    settings: getItem<AppSettings>(KEYS.settings) ?? defaultSettings,
    locked: initialLocked,
  });

  // isReadOnly if explicitly locked OR if this browser has no PIN configured
  // (viewer browsers never have a PIN, so they stay read-only even after dismissing the lock screen)
  const isReadOnly = state.locked || !hasPin();

  // Always-current state ref for callbacks
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; });

  // Load habits and recurring templates on mount
  useEffect(() => {
    const habits = getItem<Habit[]>(KEYS.habits) ?? [];
    const allEntryKeys = Object.keys(localStorage).filter(k => k.startsWith(`planner:v1:daily:`));
    const allEntries: HabitEntry[] = [];
    allEntryKeys.forEach(k => {
      const plan = getItem<DailyPlan>(k);
      if (plan?.habitEntries) allEntries.push(...plan.habitEntries);
    });
    dispatch({ type: 'SET_HABITS', habits, entries: allEntries });
    dispatch({ type: 'SET_RECURRING', templates: getTemplates() });
  }, []);

  // Load daily plan when date changes, inject recurring tasks
  useEffect(() => {
    const dateStr = toISODate(state.selectedDate);
    const key = KEYS.daily(dateStr);
    const plan = getItem<DailyPlan>(key) ?? initialDailyPlan(dateStr);
    // Inject recurring tasks that aren't already in the plan
    const templates = getTemplates();
    const toInject = templates.filter(t =>
      templateAppliesTo(t, state.selectedDate) &&
      !plan.tasks.some(task => task.templateId === t.id)
    );
    if (toInject.length > 0) {
      plan.tasks = [...plan.tasks, ...toInject.map(t => taskFromTemplate(t, dateStr))];
    }
    dispatch({ type: 'LOAD_DAILY', plan });
  }, [state.selectedDate]);

  // Load monthly plan when date changes
  useEffect(() => {
    const key = KEYS.monthly(toYearMonth(state.selectedDate));
    const plan = getItem<MonthlyPlan>(key) ?? initialMonthlyPlan(toYearMonth(state.selectedDate));
    dispatch({ type: 'LOAD_MONTHLY', plan });
  }, [state.selectedDate]);

  // Load annual plan when year changes
  useEffect(() => {
    const year = state.selectedDate.getFullYear();
    const key = KEYS.annual(year);
    const plan = getItem<AnnualPlan>(key) ?? initialAnnualPlan(year);
    dispatch({ type: 'LOAD_ANNUAL', plan });
  }, [state.selectedDate.getFullYear()]);

  // Persist daily plan
  useEffect(() => {
    if (!state.dailyPlan) return;
    setItem(KEYS.daily(state.dailyPlan.date), state.dailyPlan);
  }, [state.dailyPlan]);

  // Persist monthly plan
  useEffect(() => {
    if (!state.monthlyPlan) return;
    setItem(KEYS.monthly(state.monthlyPlan.yearMonth), state.monthlyPlan);
  }, [state.monthlyPlan]);

  // Persist annual plan
  useEffect(() => {
    if (!state.annualPlan) return;
    setItem(KEYS.annual(state.annualPlan.year), state.annualPlan);
  }, [state.annualPlan]);

  // Persist habits
  useEffect(() => {
    setItem(KEYS.habits, state.habits);
  }, [state.habits]);

  // Persist settings
  useEffect(() => {
    setItem(KEYS.settings, state.settings);
  }, [state.settings]);

  const addTask = useCallback((task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    // If recurring, also create a template
    if (task.recurrenceRule && !task.templateId) {
      const date = new Date(task.dueDate + 'T00:00:00');
      const dow = date.getDay() === 0 ? 6 : date.getDay() - 1;
      const template: RecurringTemplate = {
        id: crypto.randomUUID(),
        title: task.title,
        description: task.description,
        priority: task.priority,
        tags: task.tags,
        startTime: task.startTime,
        recurrenceRule: task.recurrenceRule,
        dayOfWeek: dow,
        dayOfMonth: date.getDate(),
        createdAt: now(),
      };
      dispatch({ type: 'ADD_RECURRING', template });
      saveTemplates([...getTemplates(), template]);
      task = { ...task, templateId: template.id };
    }
    const newTask = { ...task, id: crypto.randomUUID(), createdAt: now(), updatedAt: now() };
    dispatch({ type: 'ADD_TASK', task: newTask });
    addHistoryEntry({ action: 'Tarea creada', detail: task.title, category: 'tarea' });
  }, []);

  const updateTask = useCallback((task: Task) => {
    dispatch({ type: 'UPDATE_TASK', task: { ...task, updatedAt: now() } });
    addHistoryEntry({ action: 'Tarea actualizada', detail: task.title, category: 'tarea' });
  }, []);

  const deleteTask = useCallback((id: string) => {
    const task = stateRef.current.dailyPlan?.tasks.find(t => t.id === id);
    dispatch({ type: 'DELETE_TASK', taskId: id });
    addHistoryEntry({ action: 'Tarea eliminada', detail: task?.title ?? id, category: 'tarea' });
  }, []);

  const toggleTask = useCallback((id: string) => {
    const task = stateRef.current.dailyPlan?.tasks.find(t => t.id === id);
    const wasCompleted = task?.status === 'completada';
    dispatch({ type: 'TOGGLE_TASK', taskId: id });
    addHistoryEntry({
      action: wasCompleted ? 'Tarea reabierta' : 'Tarea completada',
      detail: task?.title ?? id,
      category: 'tarea',
    });

    // Auto-update linked goal progress (+10 on complete, -10 on reopen)
    if (task?.goalId) {
      const allGoals = [
        ...(stateRef.current.monthlyPlan?.goals ?? []),
        ...(stateRef.current.annualPlan?.goals ?? []),
      ];
      const goal = allGoals.find(g => g.id === task.goalId);
      if (goal) {
        const delta = wasCompleted ? -10 : 10;
        const newProgress = Math.max(0, Math.min(100, goal.progress + delta));
        dispatch({ type: 'UPDATE_GOAL', goal: { ...goal, progress: newProgress, updatedAt: new Date().toISOString() } });
      }
    }
  }, []);

  const addHabit = useCallback((habit: Omit<Habit, 'id' | 'createdAt'>) => {
    dispatch({
      type: 'ADD_HABIT',
      habit: { ...habit, id: crypto.randomUUID(), createdAt: now() },
    });
    addHistoryEntry({ action: 'Hábito creado', detail: habit.name, category: 'habito' });
  }, []);

  const deleteHabit = useCallback((id: string) => {
    const habit = stateRef.current.habits.find(h => h.id === id);
    dispatch({ type: 'DELETE_HABIT', habitId: id });
    addHistoryEntry({ action: 'Hábito eliminado', detail: habit?.name ?? id, category: 'habito' });
  }, []);

  const toggleHabitEntry = useCallback((habitId: string, date: string) => {
    const habit = stateRef.current.habits.find(h => h.id === habitId);
    dispatch({ type: 'TOGGLE_HABIT_ENTRY', habitId, date });
    // Directly persist to the daily plan for that date.
    // For today, the reducer also updates dailyPlan so the persist effect fires.
    // For past dates, dailyPlan.date !== date so we must write to storage here.
    const key = KEYS.daily(date);
    const plan = getItem<DailyPlan>(key) ?? { date, tasks: [], habitEntries: [] };
    const planEntries: HabitEntry[] = plan.habitEntries ?? [];
    const planExisting = planEntries.find(e => e.habitId === habitId);
    setItem(key, {
      ...plan,
      habitEntries: planExisting
        ? planEntries.map(e => e.habitId === habitId ? { ...e, completed: !e.completed } : e)
        : [...planEntries, { id: crypto.randomUUID(), habitId, date, completed: true }],
    });
    addHistoryEntry({ action: 'Hábito registrado', detail: `${habit?.name ?? habitId} — ${date}`, category: 'habito' });
  }, []);

  const addGoal = useCallback((goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => {
    dispatch({
      type: 'ADD_GOAL',
      goal: { ...goal, id: crypto.randomUUID(), createdAt: now(), updatedAt: now() },
    });
    addHistoryEntry({ action: 'Objetivo creado', detail: goal.title, category: 'objetivo' });
  }, []);

  const updateGoal = useCallback((goal: Goal) => {
    dispatch({ type: 'UPDATE_GOAL', goal: { ...goal, updatedAt: now() } });
    addHistoryEntry({ action: 'Objetivo actualizado', detail: goal.title, category: 'objetivo' });
  }, []);

  const deleteGoal = useCallback((goalId: string, scope: 'monthly' | 'annual') => {
    const goals = scope === 'monthly'
      ? stateRef.current.monthlyPlan?.goals
      : stateRef.current.annualPlan?.goals;
    const goal = goals?.find(g => g.id === goalId);
    dispatch({ type: 'DELETE_GOAL', goalId, scope });
    addHistoryEntry({ action: 'Objetivo eliminado', detail: goal?.title ?? goalId, category: 'objetivo' });
  }, []);

  const updateDailyNote = useCallback((blocks: NoteBlock[], scopeKey: string) => {
    dispatch({
      type: 'UPDATE_DAILY_NOTE',
      note: { id: crypto.randomUUID(), scopeType: 'daily', scopeKey, blocks, updatedAt: now() },
    });
    addHistoryEntry({ action: 'Nota diaria actualizada', detail: scopeKey, category: 'nota' });
  }, []);

  const updateMonthlyNote = useCallback((blocks: NoteBlock[], scopeKey: string) => {
    dispatch({
      type: 'UPDATE_MONTHLY_NOTE',
      note: { id: crypto.randomUUID(), scopeType: 'monthly', scopeKey, blocks, updatedAt: now() },
    });
    addHistoryEntry({ action: 'Nota mensual actualizada', detail: scopeKey, category: 'nota' });
  }, []);

  const addRecurringTemplate = useCallback((t: Omit<RecurringTemplate, 'id' | 'createdAt'>) => {
    const template: RecurringTemplate = { ...t, id: crypto.randomUUID(), createdAt: now() };
    dispatch({ type: 'ADD_RECURRING', template });
    saveTemplates([...getTemplates(), template]);
    addHistoryEntry({ action: 'Tarea recurrente creada', detail: t.title, category: 'tarea' });
  }, []);

  const deleteRecurringTemplate = useCallback((id: string) => {
    const template = stateRef.current.recurringTemplates.find(t => t.id === id);
    dispatch({ type: 'DELETE_RECURRING', templateId: id });
    saveTemplates(getTemplates().filter(t => t.id !== id));
    addHistoryEntry({ action: 'Tarea recurrente eliminada', detail: template?.title ?? id, category: 'tarea' });
  }, []);

  const setMood = useCallback((mood: 1 | 2 | 3 | 4 | 5) => {
    const labels = ['', 'Mal', 'Regular', 'Normal', 'Bien', 'Excelente'];
    dispatch({ type: 'SET_MOOD', mood });
    addHistoryEntry({ action: `Estado de ánimo: ${labels[mood]}`, detail: '', category: 'estado' });
  }, []);

  return (
    <PlannerContext.Provider value={{
      state, dispatch,
      isReadOnly,
      addTask, updateTask, deleteTask, toggleTask,
      addHabit, deleteHabit, toggleHabitEntry,
      addGoal, updateGoal, deleteGoal,
      updateDailyNote, updateMonthlyNote,
      setMood,
      addRecurringTemplate, deleteRecurringTemplate,
    }}>
      {children}
    </PlannerContext.Provider>
  );
}

export function usePlanner(): PlannerContextValue {
  const ctx = useContext(PlannerContext);
  if (!ctx) throw new Error('usePlanner must be used within PlannerProvider');
  return ctx;
}
