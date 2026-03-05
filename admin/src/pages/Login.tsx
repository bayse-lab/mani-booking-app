import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();

    if (profile?.role !== 'admin' && profile?.role !== 'instructor') {
      await supabase.auth.signOut();
      setError('Adgang n\u00e6gtet. Kun administratorer og instrukt\u00f8rer kan logge ind.');
      setLoading(false);
      return;
    }

    setLoading(false);
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-sand-light">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-serif font-semibold text-brand">
            Maní
          </h1>
          <p className="text-mani-taupe mt-2 text-sm tracking-widest uppercase">
            Admin Panel
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="bg-mani-cream rounded-2xl shadow-sm border border-sand p-8 space-y-5"
        >
          {error && (
            <div className="bg-sand text-mani-tierRed text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-mani-brown mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-sand rounded-xl text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none bg-sand-light"
              placeholder="admin@mani.studio"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-mani-brown mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-sand rounded-xl text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none bg-sand-light"
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-brand py-3 rounded-xl font-medium text-sm hover:bg-accent-dark transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <div className="text-center">
            <Link
              to="/forgot-password"
              className="text-sm text-mani-taupe hover:text-accent transition-colors"
            >
              Glemt password?
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
