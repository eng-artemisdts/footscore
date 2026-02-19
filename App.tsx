import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { User } from './types';
import { peladaSlug } from './utils';
import { supabase } from './supabase';
import { AuthScreen } from './components/AuthScreen';
import { PeladaSelectScreen, getPeladas } from './components/PeladaSelectScreen';
import { MainFlow } from './components/MainFlow';

function supabaseUserToAppUser(supabaseUser: {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
    given_name?: string;
    family_name?: string;
  };
}): User {
  const meta = supabaseUser.user_metadata ?? {};
  const full =
    meta.full_name ||
    meta.name ||
    [meta.given_name, meta.family_name].filter(Boolean).join(' ').trim();
  const fromEmail = (supabaseUser.email?.split('@')[0] ?? '').trim();
  const fromEmailDisplay = fromEmail ? fromEmail[0].toUpperCase() + fromEmail.slice(1).toLowerCase() : '';
  const raw = (full || fromEmailDisplay || 'Usuário').trim();
  const isProviderName = /^google$/i.test(raw);
  const name = isProviderName ? (fromEmailDisplay || 'Usuário') : (raw || 'Usuário');
  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? '',
    name,
    role: 'ADMIN',
  };
}

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('pelada_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [authChecked, setAuthChecked] = useState(!supabase);

  useEffect(() => {
    if (user) {
      localStorage.setItem('pelada_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('pelada_user');
    }
  }, [user]);

  useEffect(() => {
    if (!supabase) {
      setAuthChecked(true);
      return;
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(supabaseUserToAppUser(session.user));
      }
      setAuthChecked(true);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(supabaseUserToAppUser(session.user));
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#050810] flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onLogin={setUser} />;
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/pelada" replace />} />
      <Route path="/pelada" element={<PeladaSelectScreen user={user} />} />
      <Route path="/pelada/:peladaSlug" element={<PeladaRoute user={user} onLogout={() => { supabase?.auth.signOut(); setUser(null); }} />} />
      <Route path="*" element={<Navigate to="/pelada" replace />} />
    </Routes>
  );
};

function PeladaRoute({ user, onLogout }: { user: User; onLogout: () => void }) {
  const { peladaSlug: slug } = useParams<{ peladaSlug: string }>();
  const peladas = getPeladas(user.id);
  const found = slug ? peladas.find((p) => peladaSlug(p.name) === slug) : undefined;
  const pelada = found || null;

  if (!pelada) {
    return <Navigate to="/pelada" replace />;
  }

  return <MainFlow key={pelada.id} user={user} pelada={pelada} onLogout={onLogout} />;
}

export default App;
