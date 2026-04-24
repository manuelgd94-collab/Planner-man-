import type { RecurringTemplate, Task } from '../types';
import { getItem, setItem, KEYS } from './localStorage';

export function getTemplates(): RecurringTemplate[] {
  return getItem<RecurringTemplate[]>(KEYS.recurringTemplates) ?? [];
}

export function saveTemplates(templates: RecurringTemplate[]): void {
  setItem(KEYS.recurringTemplates, templates);
}

/** Returns true if this template should generate a task for the given date */
export function templateAppliesTo(template: RecurringTemplate, date: Date): boolean {
  if (template.archivedAt) return false;
  switch (template.recurrenceRule) {
    case 'diaria':
      return true;
    case 'semanal': {
      // getDay(): 0=Sun..6=Sat → convert to Mon=0
      const dow = date.getDay() === 0 ? 6 : date.getDay() - 1;
      return template.dayOfWeek === dow;
    }
    case 'mensual':
      return template.dayOfMonth === date.getDate();
    default:
      return false;
  }
}

/** Build a task instance from a template for a specific date */
export function taskFromTemplate(template: RecurringTemplate, dateStr: string): Task {
  return {
    id: crypto.randomUUID(),
    title: template.title,
    description: template.description,
    priority: template.priority,
    status: 'pendiente',
    dueDate: dateStr,
    tags: template.tags,
    startTime: template.startTime,
    recurrenceRule: template.recurrenceRule,
    templateId: template.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
