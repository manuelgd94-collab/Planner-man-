import { useState } from 'react';
import { LogIn, UserPlus, Eye, EyeOff, Loader2 } from 'lucide-react';
import { signIn, signUp, type UserProfile } from '../../store/firebaseAuth';

interface Props {
  onAuth: (user: UserProfile) => void;
}

export function LoginScreen({ onAuth }: Props) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName(''); setEmail(''); setPassword(''); setError(null);
  }

  function switchTab(t: 'login' | 'register') {
    setTab(t); reset();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = tab === 'login'
        ? await signIn(email, password)
        : await signUp(email, password, name);
      onAuth(user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential')) {
        setError('Email o contraseña incorrectos.');
      } else if (msg.includes('email-already-in-use')) {
        setError('Ese email ya está registrado. Inicia sesión.');
      } else if (msg.includes('weak-password')) {
        setError('La contraseña debe tener al menos 6 caracteres.');
      } else if (msg.includes('invalid-email')) {
        setError('El email no es válido.');
      } else if (msg.includes('Perfil de usuario no encontrado')) {
        setError('Cuenta sin perfil. Contacta al administrador.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo / App Name */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gray-900 mb-4">
            <span className="text-white text-2xl font-bold">P</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Planner</h1>
          <p className="text-sm text-text-muted mt-1">Organiza tu jornada</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          {/* Tabs */}
          <div className="grid grid-cols-2 border-b border-border">
            <button
              onClick={() => switchTab('login')}
              className={`py-3 text-sm font-medium transition-colors ${
                tab === 'login'
                  ? 'text-text-primary border-b-2 border-gray-900 bg-white'
                  : 'text-text-muted hover:text-text-secondary bg-surface-secondary'
              }`}
            >
              <LogIn size={14} className="inline mr-1.5 mb-0.5" />
              Iniciar sesión
            </button>
            <button
              onClick={() => switchTab('register')}
              className={`py-3 text-sm font-medium transition-colors ${
                tab === 'register'
                  ? 'text-text-primary border-b-2 border-gray-900 bg-white'
                  : 'text-text-muted hover:text-text-secondary bg-surface-secondary'
              }`}
            >
              <UserPlus size={14} className="inline mr-1.5 mb-0.5" />
              Registrarse
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {tab === 'register' && (
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Nombre</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  placeholder="Tu nombre"
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="correo@ejemplo.com"
                className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Contraseña</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 pr-10 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {tab === 'register' && (
                <p className="text-[11px] text-text-muted mt-1">Mínimo 6 caracteres</p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-xs text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader2 size={15} className="animate-spin" /> Cargando...</>
              ) : tab === 'login' ? (
                <><LogIn size={15} /> Entrar</>
              ) : (
                <><UserPlus size={15} /> Crear cuenta</>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-text-muted mt-4">
          {tab === 'login'
            ? '¿Sin cuenta? Regístrate arriba.'
            : 'El primer usuario registrado será administrador.'}
        </p>
      </div>
    </div>
  );
}
