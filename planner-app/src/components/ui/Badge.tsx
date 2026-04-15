import { clsx } from 'clsx';
import type { Priority, GoalStatus } from '../../types';

interface BadgeProps {
  label: string;
  color?: string;
  className?: string;
}

export function Badge({ label, color = '#6B7280', className }: BadgeProps) {
  return (
    <span
      className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', className)}
      style={{ backgroundColor: `${color}20`, color }}
    >
      {label}
    </span>
  );
}

const PRIORITY_COLORS: Record<Priority, string> = {
  alta: '#EF4444',
  media: '#F59E0B',
  baja: '#22C55E',
};

const PRIORITY_LABELS: Record<Priority, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <Badge label={PRIORITY_LABELS[priority]} color={PRIORITY_COLORS[priority]} />;
}

const GOAL_STATUS_COLORS: Record<GoalStatus, string> = {
  no_iniciada: '#6B7280',
  en_progreso: '#3B82F6',
  completada: '#22C55E',
  abandonada: '#EF4444',
};

const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  no_iniciada: 'No iniciada',
  en_progreso: 'En progreso',
  completada: 'Completada',
  abandonada: 'Abandonada',
};

export function GoalStatusBadge({ status }: { status: GoalStatus }) {
  return <Badge label={GOAL_STATUS_LABELS[status]} color={GOAL_STATUS_COLORS[status]} />;
}
