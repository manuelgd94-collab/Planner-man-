import { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode } from 'react';
import type {
  Task, Habit, HabitEntry, Goal, DailyPlan, MonthlyPlan, AnnualPlan,
  Note, NoteBlock, ViewType, AppSettings,
} from '../types';
import { getItem, setItem, KEYS } from './localStorage';
import { toISODate, toYearMonth } from '../utils/dateUtils';

interface AppState {
  view: ViewType;
  selectedDate: Date;
  habits: Habit[];
  habitEntries: HabitEntry[];
  dailyPlan: DailyPlan | null;
  monthlyPlan: MonthlyPlan | null;
  annualPlan: AnnualPlan | null;
  settings: AppSettings;
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
  | { type: 'TOGGLE_SIDEBAR' };

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
      const existing = state.habitEntries.find(e => e.habitId === action.habitId && e.date === action.date);
      let entries: HabitEntry[];
      if (existing) {
        entries = state.habitEntries.map(e =>
          e.habitId === action.habitId && e.date === action.date
            ? { ...e, completed: !e.completed }
            : e
        );
      } else {
        entries = [...state.habitEntries, {
          id: crypto.randomUUID(),
          habitId: action.habitId,
          date: action.date,
          completed: true,
        }];
      }
      return { ...state, habitEntries: entries };
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

    default:
      return state;
  }
}

interface PlannerContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  // Convenience helpers
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

  const [state, dispatch] = useReducer(reducer, {
    view: 'diario',
    selectedDate: today,
    habits: [],
    habitEntries: [],
    dailyPlan: null,
    monthlyPlan: null,
    annualPlan: null,
    settings: getItem<AppSettings>(KEYS.settings) ?? defaultSettings,
  });

  // Load habits on mount
  useEffect(() => {
    const habits = getItem<Habit[]>(KEYS.habits) ?? [];
    const allEntryKeys = Object.keys(localStorage).filter(k => k.startsWith(`planner:v1:daily:`));
    const allEntries: HabitEntry[] = [];
    allEntryKeys.forEach(k => {
      const plan = getItem<DailyPlan>(k);
      if (plan?.habitEntries) allEntries.push(...plan.habitEntries);
    });
    dispatch({ type: 'SET_HABITS', habits, entries: allEntries });
  }, []);

  // Load daily plan when date changes
  useEffect(() => {
    const key = KEYS.daily(toISODate(state.selectedDate));
    const plan = getItem<DailyPlan>(key) ?? initialDailyPlan(toISODate(state.selectedDate));
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
    dispatch({
      type: 'ADD_TASK',
      task: { ...task, id: crypto.randomUUID(), createdAt: now(), updatedAt: now() },
    });
  }, []);

  const updateTask = useCallback((task: Task) => {
    dispatch({ type: 'UPDATE_TASK', task: { ...task, updatedAt: now() } });
  }, []);

  const deleteTask = useCallback((id: string) => {
    dispatch({ type: 'DELETE_TASK', taskId: id });
  }, []);

  const toggleTask = useCallback((id: string) => {
    dispatch({ type: 'TOGGLE_TASK', taskId: id });
  }, []);

  const addHabit = useCallback((habit: Omit<Habit, 'id' | 'createdAt'>) => {
    dispatch({
      type: 'ADD_HABIT',
      habit: { ...habit, id: crypto.randomUUID(), createdAt: now() },
    });
  }, []);

  const deleteHabit = useCallback((id: string) => {
    dispatch({ type: 'DELETE_HABIT', habitId: id });
  }, []);

  const toggleHabitEntry = useCallback((habitId: string, date: string) => {
    dispatch({ type: 'TOGGLE_HABIT_ENTRY', habitId, date });
  }, []);

  const addGoal = useCallback((goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => {
    dispatch({
      type: 'ADD_GOAL',
      goal: { ...goal, id: crypto.randomUUID(), createdAt: now(), updatedAt: now() },
    });
  }, []);

  const updateGoal = useCallback((goal: Goal) => {
    dispatch({ type: 'UPDATE_GOAL', goal: { ...goal, updatedAt: now() } });
  }, []);

  const deleteGoal = useCallback((goalId: string, scope: 'monthly' | 'annual') => {
    dispatch({ type: 'DELETE_GOAL', goalId, scope });
  }, []);

  const updateDailyNote = useCallback((blocks: NoteBlock[], scopeKey: string) => {
    dispatch({
      type: 'UPDATE_DAILY_NOTE',
      note: {
        id: crypto.randomUUID(),
        scopeType: 'daily',
        scopeKey,
        blocks,
        updatedAt: now(),
      },
    });
  }, []);

  const updateMonthlyNote = useCallback((blocks: NoteBlock[], scopeKey: string) => {
    dispatch({
      type: 'UPDATE_MONTHLY_NOTE',
      note: {
        id: crypto.randomUUID(),
        scopeType: 'monthly',
        scopeKey,
        blocks,
        updatedAt: now(),
      },
    });
  }, []);

  const setMood = useCallback((mood: 1 | 2 | 3 | 4 | 5) => {
    dispatch({ type: 'SET_MOOD', mood });
  }, []);

  return (
    <PlannerContext.Provider value={{
      state, dispatch,
      addTask, updateTask, deleteTask, toggleTask,
      addHabit, deleteHabit, toggleHabitEntry,
      addGoal, updateGoal, deleteGoal,
      updateDailyNote, updateMonthlyNote,
      setMood,
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
