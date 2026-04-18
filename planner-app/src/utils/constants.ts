import type { Priority, TaskStatus, GoalStatus, Quarter } from '../types';

export const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export const DIAS_SEMANA_COMPLETO = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const TRIMESTRES: Record<Quarter, { label: string; months: string[] }> = {
  Q1: { label: 'T1 — Ene / Feb / Mar', months: ['Enero', 'Febrero', 'Marzo'] },
  Q2: { label: 'T2 — Abr / May / Jun', months: ['Abril', 'Mayo', 'Junio'] },
  Q3: { label: 'T3 — Jul / Ago / Sep', months: ['Julio', 'Agosto', 'Septiembre'] },
  Q4: { label: 'T4 — Oct / Nov / Dic', months: ['Octubre', 'Noviembre', 'Diciembre'] },
};

export const PRIORIDAD_LABELS: Record<Priority, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
};

export const ESTADO_LABELS: Record<TaskStatus, string> = {
  pendiente: 'Pendiente',
  en_progreso: 'En progreso',
  completada: 'Completada',
  cancelada: 'Cancelada',
  reprogramada: 'Reprogramada',
};

export const ESTADO_OBJETIVO_LABELS: Record<GoalStatus, string> = {
  no_iniciada: 'No iniciada',
  en_progreso: 'En progreso',
  completada: 'Completada',
  abandonada: 'Abandonada',
};

export const CATEGORIAS_OBJETIVO = [
  'Salud', 'Trabajo', 'Personal', 'Familia', 'Finanzas', 'Aprendizaje', 'Otro',
];

export const COLORES_HABITO = [
  'blue', 'green', 'purple', 'pink', 'orange', 'red', 'yellow', 'indigo',
];

export const COLORES_OBJETIVO = [
  '#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6',
];
