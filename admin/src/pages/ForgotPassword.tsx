import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-sand-light">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-serif font-semibold text-brand">
            Maní
          </h1>
          <p className="text-mani-taupe mt-2 text-sm tracking-widest uppercase">
            Nulstil password
          </p>
        </div>

        <div className="bg-mani-cream rounded-2xl shadow-sm border border-sand p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#28A745" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-brand">Email sendt!</h2>
              <p className="text-sm text-mani-brown">
                Vi har sendt en email til <strong>{email}</strong> med et link til at nulstille dit password.
              </p>
              <p className="text-xs text-mani-taupe">
                Tjek også din spam-mappe hvis du ikke kan finde emailen.
              </p>
              <Link
                to="/login"
                className="inline-block mt-4 text-sm text-accent hover:text-accent-dark font-medium transition-colors"
              >
                &larr; Tilbage til login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <p className="text-sm text-mani-brown">
                Indtast din email-adresse, så sender vi et link til at nulstille dit password.
              </p>

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
                  placeholder="din@email.com"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-accent text-brand py-3 rounded-xl font-medium text-sm hover:bg-accent-dark transition-colors disabled:opacity-50"
              >
                {loading ? 'Sender...' : 'Send nulstillingslink'}
              </button>

              <div className="text-center">
                <Link
                  to="/login"
                  className="text-sm text-mani-taupe hover:text-accent transition-colors"
                >
                  &larr; Tilbage til login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
