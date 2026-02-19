import React, { useState } from 'react';
import { User } from '../types';
import { supabase } from '../supabase';

interface AuthScreenProps {
  onLogin: (user: User) => void;
}

const ACCOUNTS_KEY = 'futscore_accounts';

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'phone'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAccounts = (): any[] => {
    const data = localStorage.getItem(ACCOUNTS_KEY);
    return data ? JSON.parse(data) : [];
  };

  const saveAccount = (account: any) => {
    const accounts = getAccounts();
    accounts.push(account);
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    setTimeout(() => {
      const accounts = getAccounts();
      
      if (mode === 'signup') {
        // Verificar se e-mail já existe
        if (accounts.some(acc => acc.email === email)) {
          setError('E-mail já cadastrado.');
          setLoading(false);
          return;
        }

        const newUserAccount = {
          id: Math.random().toString(36).slice(2),
          email,
          password,
          name,
          phone: '',
          role: 'ADMIN'
        };

        saveAccount(newUserAccount);
        onLogin({
          id: newUserAccount.id,
          email: newUserAccount.email,
          name: newUserAccount.name,
          role: 'ADMIN'
        });
      } else if (mode === 'login') {
        const found = accounts.find(acc => acc.email === email && acc.password === password);
        
        if (found) {
          onLogin({
            id: found.id,
            email: found.email,
            name: found.name,
            role: 'ADMIN'
          });
        } else {
          setError('E-mail ou senha incorretos.');
        }
      } else if (mode === 'phone') {
        // Simulação de login por celular: Se não existe, cria. Se existe, loga.
        let found = accounts.find(acc => acc.phone === phone);
        if (!found) {
          found = {
            id: Math.random().toString(36).slice(2),
            email: `${phone}@phone.com`,
            password: 'phone-login',
            name: `Craque ${phone.slice(-4)}`,
            phone,
            role: 'ADMIN'
          };
          saveAccount(found);
        }
        onLogin({
          id: found.id,
          email: found.email,
          name: found.name,
          role: 'ADMIN'
        });
      }
      setLoading(false);
    }, 1000);
  };

  const handleProviderLogin = (provider: string) => {
    setLoading(true);
    setError(null);

    setTimeout(() => {
      const providerEmail = `${provider.toLowerCase()}@futscore.com`;
      const accounts = getAccounts();
      let found = accounts.find(acc => acc.email === providerEmail);

      if (!found) {
        found = {
          id: Math.random().toString(36).slice(2),
          email: providerEmail,
          password: `social-${provider}`,
          name: `${provider} User`,
          phone: '',
          role: 'ADMIN'
        };
        saveAccount(found);
      }

      onLogin({
        id: found.id,
        email: found.email,
        name: found.name,
        role: 'ADMIN'
      });
      setLoading(false);
    }, 1200);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    if (supabase) {
      try {
        const { error: err } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/`,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          },
        });
        if (err) {
          const msg = (err as { message?: string; msg?: string }).message ?? (err as { msg?: string }).msg ?? '';
          const isProviderDisabled =
            String(msg).includes('not enabled') || (err as { error_code?: string }).error_code === 'validation_failed';
          setError(
            isProviderDisabled
              ? 'Login com Google não está habilitado. No painel do Supabase: Authentication → Providers → Google → ative e preencha Client ID e Secret.'
              : msg || 'Erro ao conectar com Google.'
          );
          setLoading(false);
        }
        // Se sucesso, o usuário será redirecionado; onAuthStateChange no App fará o login
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erro ao conectar com Google.';
        const isProviderDisabled = typeof msg === 'string' && (msg.includes('not enabled') || msg.includes('validation_failed'));
        setError(
          isProviderDisabled
            ? 'Login com Google não está habilitado. No painel do Supabase: Authentication → Providers → Google → ative e preencha Client ID e Secret.'
            : msg
        );
        setLoading(false);
      }
    } else {
      handleProviderLogin('Google');
    }
  };

  return (
    <div className="min-h-screen bg-[#050810] flex items-center justify-center p-4 overflow-hidden relative font-normal">
      {/* Background Decorativo */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] aspect-square bg-cyan-600/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] aspect-square bg-blue-600/10 blur-[150px] rounded-full" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-cyan-500/20 mb-6 group hover:scale-110 transition-transform">
            <span className="font-black text-4xl text-black">F</span>
          </div>
          <h1 className="text-3xl font-black tracking-tighter uppercase mb-2">FutScore</h1>
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em]">Gerencie seu grupo com elite</p>
        </div>

        <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[40px] p-8 sm:p-10 shadow-2xl">
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-2xl mb-8">
            <button 
              onClick={() => { setMode('login'); setError(null); }}
              className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'login' ? 'bg-white/10 text-white' : 'text-white/20'}`}
            >
              Entrar
            </button>
            <button 
              onClick={() => { setMode('signup'); setError(null); }}
              className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'signup' ? 'bg-white/10 text-white' : 'text-white/20'}`}
            >
              Criar Conta
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-[10px] font-black uppercase tracking-widest text-center animate-in fade-in slide-in-from-top-2">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 mb-8">
            {mode === 'signup' && (
              <div className="space-y-2">
                <label className="text-[9px] font-black text-white/20 uppercase tracking-widest ml-1">Seu Nome</label>
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-2xl py-3.5 px-6 text-sm focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-white/10"
                  placeholder="Ex: Neymar Jr"
                />
              </div>
            )}

            {mode === 'phone' ? (
               <div className="space-y-2">
                <label className="text-[9px] font-black text-white/20 uppercase tracking-widest ml-1">Número do Celular</label>
                <input 
                  type="tel" 
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-2xl py-3.5 px-6 text-sm focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-white/10"
                  placeholder="(00) 00000-0000"
                />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-white/20 uppercase tracking-widest ml-1">E-mail</label>
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-3.5 px-6 text-sm focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-white/10"
                    placeholder="voce@exemplo.com"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-white/20 uppercase tracking-widest ml-1">Senha</label>
                  <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-3.5 px-6 text-sm focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-white/10"
                    placeholder="••••••••"
                  />
                </div>
              </>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-cyan-400 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                mode === 'login' ? 'Acessar Elenco' : mode === 'signup' ? 'Finalizar Cadastro' : 'Entrar com SMS'
              )}
            </button>
          </form>

          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
            <div className="relative flex justify-center text-[8px] uppercase font-black tracking-widest"><span className="bg-[#0c1220] px-3 text-white/20">Ou continue com</span></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex items-center justify-center gap-3 py-3 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all group disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5.04c1.94 0 3.51.68 4.75 1.81l3.55-3.55C18.1 1.31 15.3 0 12 0 7.31 0 3.25 2.69 1.25 6.64l4.13 3.2C6.38 7.39 8.95 5.04 12 5.04z" />
                <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.86 3C22.21 18.9 23.49 15.89 23.49 12.27z" />
                <path fill="#FBBC05" d="M5.38 14.36c-.24-.73-.38-1.52-.38-2.36s.14-1.63.38-2.36L1.25 6.64C.45 8.24 0 10.06 0 12s.45 3.76 1.25 5.36l4.13-3z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.47 1.15-4.07 1.15-3.05 0-5.62-2.35-6.62-5.52l-4.13 3C3.25 21.31 7.31 24 12 24z" />
              </svg>
              <span className="text-[9px] font-black uppercase text-white/40 group-hover:text-white transition-colors">Google</span>
            </button>
            <button 
              onClick={() => { setMode(mode === 'phone' ? 'login' : 'phone'); setError(null); }}
              className={`flex items-center justify-center gap-3 py-3 border rounded-2xl transition-all group ${mode === 'phone' ? 'bg-cyan-500/20 border-cyan-500/50' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
            >
              <span className="text-sm">📱</span>
              <span className="text-[9px] font-black uppercase text-white/40 group-hover:text-white transition-colors">Celular</span>
            </button>
          </div>
        </div>

        <p className="mt-8 text-center text-[9px] font-bold text-white/10 uppercase tracking-widest leading-loose">
          Ao entrar você concorda com nossos <br />
          <span className="text-white/20 hover:text-cyan-500 cursor-pointer">Termos de Uso</span> e <span className="text-white/20 hover:text-cyan-500 cursor-pointer">Privacidade</span>
        </p>
      </div>
    </div>
  );
};
