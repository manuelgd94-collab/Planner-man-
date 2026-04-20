import { useEffect, useState } from 'react';
import { Users, UserCheck, UserX, Target, ChevronRight, Loader2, Plus, X, Shield, User } from 'lucide-react';
import { clsx } from 'clsx';
import { getAllProfiles, updateUserRole, type UserProfile } from '../store/firebaseAuth';
import { getUserAllData, setUserItem } from '../store/cloudSync';
import { SCHEMA_VERSION } from '../store/localStorage';
import type { AnnualPlan, Goal, DailyPlan, Task } from '../types';
import { toISODate } from '../utils/dateUtils';

const PREFIX = `planner:v${SCHEMA_VERSION}`;
const ANNUAL_KEY = (year: number) => `${PREFIX}:annual:${year}`;
const TODAY = toISODate(new Date());
const THIS_YEAR = new Date().getFullYear();

// ── Assign Objective Modal ────────────────────────────────────────────────────

interface AssignGoalModalProps {
  user: UserProfile;
  onClose: () => void;
}

function AssignGoalModal({ user, onClose }: AssignGoalModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      // Fetch current annual plan
      const data = await getUserAllData(user.uid);
      const existing = (data[ANNUAL_KEY(THIS_YEAR)] as AnnualPlan | undefined) ?? { year: THIS_YEAR, goals: [] };

      const newGoal: Goal = {
        id: `goal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        title: title.trim(),
        description: description.trim() || undefined,
        status: 'no_iniciada',
        scope: 'anual',
        year: THIS_YEAR,
        progress: 0,
        category: category.trim() || undefined,
        color: '#6366f1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updated: AnnualPlan = {
        ...existing,
        goals: [...(existing.goals ?? []), newGoal],
      };

      await setUserItem(user.uid, ANNUAL_KEY(THIS_YEAR), updated);
      setSaved(true);
      setTimeout(onClose, 1200);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl border border-border shadow-lg w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-text-primary text-sm">Asignar objetivo a {user.name}</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-secondary"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Objetivo *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="ej. Completar certificación"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Descripción</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="Detalle o instrucciones..."
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Categoría</label>
            <input
              value={category}
              onChange={e => setCategory(e.target.value)}
              placeholder="ej. Capacitación, Operaciones..."
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          {saved && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-xs px-3 py-2 rounded-lg">
              ¡Objetivo asignado correctamente!
            </div>
          )}
        </div>
        <div className="px-5 pb-4 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:bg-surface-secondary rounded-lg transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim() || saving || saved}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Asignar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── User Detail Panel ─────────────────────────────────────────────────────────

interface UserDetailProps {
  user: UserProfile;
  onRoleChange: (uid: string, role: 'admin' | 'user') => void;
}

function UserDetail({ user, onRoleChange }: UserDetailProps) {
  const [userData, setUserData] = useState<Record<string, unknown> | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [togglingRole, setTogglingRole] = useState(false);

  useEffect(() => {
    setLoadingData(true);
    getUserAllData(user.uid).then(d => {
      setUserData(d);
      setLoadingData(false);
    });
  }, [user.uid]);

  async function handleToggleRole() {
    setTogglingRole(true);
    const newRole: 'admin' | 'user' = user.role === 'admin' ? 'user' : 'admin';
    await updateUserRole(user.uid, newRole);
    onRoleChange(user.uid, newRole);
    setTogglingRole(false);
  }

  const todayPlan = userData ? (userData[`${PREFIX}:daily:${TODAY}`] as DailyPlan | undefined) : undefined;
  const todayTasks: Task[] = todayPlan?.tasks ?? [];
  const annualPlan = userData ? (userData[ANNUAL_KEY(THIS_YEAR)] as AnnualPlan | undefined) : undefined;
  const annualGoals: Goal[] = annualPlan?.goals ?? [];

  const completed = todayTasks.filter(t => t.status === 'completada').length;
  const pending = todayTasks.filter(t => t.status !== 'completada' && t.status !== 'cancelada').length;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
      {/* Profile header */}
      <div className="bg-white border border-border rounded-xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-text-primary">{user.name}</p>
              <p className="text-xs text-text-muted">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={clsx(
              'flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
              user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
            )}>
              {user.role === 'admin' ? <Shield size={11} /> : <User size={11} />}
              {user.role === 'admin' ? 'Admin' : 'Usuario'}
            </span>
            <button
              onClick={handleToggleRole}
              disabled={togglingRole}
              className="text-xs px-2.5 py-1 border border-border rounded-lg hover:bg-surface-secondary transition-colors text-text-secondary disabled:opacity-60"
            >
              {togglingRole ? <Loader2 size={12} className="animate-spin inline" /> : (user.role === 'admin' ? 'Quitar admin' : 'Hacer admin')}
            </button>
          </div>
        </div>
      </div>

      {loadingData ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={22} className="animate-spin text-text-muted" />
        </div>
      ) : (
        <>
          {/* Today's summary */}
          <div className="bg-white border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Hoy ({TODAY})</h3>
            {todayTasks.length === 0 ? (
              <p className="text-sm text-text-muted">Sin tareas registradas hoy.</p>
            ) : (
              <>
                <div className="flex gap-4 mb-3">
                  <div className="text-center">
                    <p className="text-xl font-bold text-green-600">{completed}</p>
                    <p className="text-[11px] text-text-muted">Completadas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-amber-600">{pending}</p>
                    <p className="text-[11px] text-text-muted">Pendientes</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-text-secondary">{todayTasks.length}</p>
                    <p className="text-[11px] text-text-muted">Total</p>
                  </div>
                </div>
                <ul className="space-y-1.5">
                  {todayTasks.slice(0, 6).map(t => (
                    <li key={t.id} className="flex items-center gap-2 text-sm">
                      <span className={clsx(
                        'w-1.5 h-1.5 rounded-full flex-shrink-0',
                        t.status === 'completada' ? 'bg-green-500' : t.priority === 'alta' ? 'bg-red-500' : t.priority === 'media' ? 'bg-amber-400' : 'bg-green-400'
                      )} />
                      <span className={clsx(t.status === 'completada' ? 'line-through text-text-muted' : 'text-text-primary')}>
                        {t.title}
                      </span>
                    </li>
                  ))}
                  {todayTasks.length > 6 && <li className="text-xs text-text-muted">+{todayTasks.length - 6} más...</li>}
                </ul>
              </>
            )}
          </div>

          {/* Annual goals */}
          <div className="bg-white border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-text-primary">Objetivos {THIS_YEAR}</h3>
              <button
                onClick={() => setShowAssign(true)}
                className="flex items-center gap-1 text-xs px-2.5 py-1 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                <Plus size={12} /> Asignar
              </button>
            </div>
            {annualGoals.length === 0 ? (
              <p className="text-sm text-text-muted">Sin objetivos anuales.</p>
            ) : (
              <ul className="space-y-2">
                {annualGoals.map(g => (
                  <li key={g.id} className="flex items-center gap-2">
                    <Target size={13} className="text-indigo-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary truncate">{g.title}</p>
                      {g.category && <p className="text-[11px] text-text-muted">{g.category}</p>}
                    </div>
                    <span className={clsx(
                      'text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0',
                      g.status === 'completada' ? 'bg-green-100 text-green-700' :
                      g.status === 'en_progreso' ? 'bg-blue-100 text-blue-700' :
                      g.status === 'abandonada' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-600'
                    )}>
                      {g.progress}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {showAssign && <AssignGoalModal user={user} onClose={() => setShowAssign(false)} />}
    </div>
  );
}

// ── Main AdminPage ────────────────────────────────────────────────────────────

export function AdminPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  useEffect(() => {
    getAllProfiles().then(ps => {
      setUsers(ps.sort((a, b) => a.name.localeCompare(b.name)));
      setLoading(false);
    });
  }, []);

  function handleRoleChange(uid: string, role: 'admin' | 'user') {
    setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role } : u));
  }

  const selectedUser = users.find(u => u.uid === selectedUid) ?? null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={26} className="animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* User list */}
      <div className={clsx(
        'flex flex-col border-r border-border bg-white flex-shrink-0 overflow-y-auto',
        selectedUser ? 'hidden md:flex w-64' : 'flex w-full md:w-64'
      )}>
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-text-muted" />
            <h2 className="text-sm font-semibold text-text-primary">Usuarios ({users.length})</h2>
          </div>
        </div>
        <ul className="flex-1">
          {users.map(u => (
            <li key={u.uid}>
              <button
                onClick={() => setSelectedUid(u.uid)}
                className={clsx(
                  'w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-secondary transition-colors border-b border-border/50',
                  selectedUid === u.uid ? 'bg-surface-secondary' : ''
                )}
              >
                <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{u.name}</p>
                  <p className="text-[11px] text-text-muted truncate">{u.email}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {u.role === 'admin'
                    ? <UserCheck size={13} className="text-purple-500" />
                    : <UserX size={13} className="text-text-muted" />}
                  <ChevronRight size={13} className="text-text-muted" />
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Detail panel */}
      {selectedUser ? (
        <div className="flex flex-col flex-1 min-w-0">
          {/* Mobile back button */}
          <div className="md:hidden px-4 py-2.5 border-b border-border bg-white flex items-center gap-2">
            <button
              onClick={() => setSelectedUid(null)}
              className="text-sm text-text-secondary hover:text-text-primary flex items-center gap-1"
            >
              ← Usuarios
            </button>
          </div>
          <UserDetail user={selectedUser} onRoleChange={handleRoleChange} />
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center text-text-muted text-sm">
          Selecciona un usuario para ver detalles
        </div>
      )}
    </div>
  );
}
