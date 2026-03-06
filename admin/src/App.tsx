import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';
import Layout from './components/Layout';
import LoginPage from './pages/Login';
import ForgotPasswordPage from './pages/ForgotPassword';
import DashboardPage from './pages/Dashboard';
import ClassesPage from './pages/Classes';
import SchedulePage from './pages/Schedule';
import ClassDetailPage from './pages/ClassDetail';
import UsersPage from './pages/Users';
import CentersPage from './pages/Centers';
import InstructorSchedulePage from './pages/InstructorSchedule';
import MemberTypesPage from './pages/MemberTypes';

// Auth Context
interface AdminProfile {
  full_name: string | null;
  role: string;
}

interface AuthContextType {
  session: Session | null;
  isAdmin: boolean;
  isInstructor: boolean;
  profile: AdminProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  session: null,
  isAdmin: false,
  isInstructor: false,
  profile: null,
  loading: true,
  signOut: async () => {},
});

export const useAdminAuth = () => useContext(AuthContext);

// Center Context
interface Center {
  id: string;
  name: string;
  city: string | null;
}

interface CenterContextType {
  centers: Center[];
  selectedCenter: string | null;
  setSelectedCenter: (id: string | null) => void;
}

export const CenterContext = createContext<CenterContextType>({
  centers: [],
  selectedCenter: null,
  setSelectedCenter: () => {},
});

export const useCenterContext = () => useContext(CenterContext);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, isAdmin, isInstructor, loading } = useAdminAuth();
  if (loading)
    return (
      <div className="flex items-center justify-center h-screen bg-sand-light">
        <div className="text-mani-taupe">Loading...</div>
      </div>
    );
  if (!session || (!isAdmin && !isInstructor)) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAdminAuth();
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isInstructor, setIsInstructor] = useState(false);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [centers, setCenters] = useState<Center[]>([]);
  const [selectedCenter, setSelectedCenter] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) checkRole(session.user.id);
      else setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) checkRole(session.user.id);
      else {
        setIsAdmin(false);
        setIsInstructor(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    fetchCenters();
  }, []);

  async function fetchCenters() {
    const { data } = await supabase
      .from('centers')
      .select('id, name, city')
      .eq('is_active', true)
      .order('name');
    setCenters((data ?? []) as Center[]);
  }

  async function checkRole(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', userId)
      .single();
    setIsAdmin(data?.role === 'admin');
    setIsInstructor(data?.role === 'instructor');
    setProfile(data ? { full_name: data.full_name, role: data.role } : null);
    setLoading(false);
  }

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setIsInstructor(false);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ session, isAdmin, isInstructor, profile, loading, signOut }}>
      <CenterContext.Provider
        value={{ centers, selectedCenter, setSelectedCenter }}
      >
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* Admins go to Dashboard, Instructors go to their schedule */}
            <Route index element={isInstructor && !isAdmin ? <Navigate to="/my-schedule" replace /> : <DashboardPage />} />
            <Route path="classes" element={<AdminOnlyRoute><ClassesPage /></AdminOnlyRoute>} />
            <Route path="schedule" element={<SchedulePage />} />
            <Route path="schedule/:id" element={<ClassDetailPage />} />
            <Route path="users" element={<AdminOnlyRoute><UsersPage /></AdminOnlyRoute>} />
            <Route path="centers" element={<AdminOnlyRoute><CentersPage /></AdminOnlyRoute>} />
            <Route path="member-types" element={<AdminOnlyRoute><MemberTypesPage /></AdminOnlyRoute>} />
            <Route path="my-schedule" element={<InstructorSchedulePage />} />
          </Route>
        </Routes>
      </CenterContext.Provider>
    </AuthContext.Provider>
  );
}
