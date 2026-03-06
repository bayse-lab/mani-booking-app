import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function LegalPage() {
  const [privacyPolicy, setPrivacyPolicy] = useState('');
  const [termsOfService, setTermsOfService] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>('privacy');

  useEffect(() => {
    fetchLegalTexts();
  }, []);

  async function fetchLegalTexts() {
    const { data } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['privacy_policy', 'terms_of_service']);

    if (data) {
      for (const row of data) {
        if (row.key === 'privacy_policy') setPrivacyPolicy(row.value);
        if (row.key === 'terms_of_service') setTermsOfService(row.value);
      }
    }
    setLoading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    const entries = [
      { key: 'privacy_policy', value: privacyPolicy },
      { key: 'terms_of_service', value: termsOfService },
    ];

    for (const entry of entries) {
      await supabase
        .from('app_settings')
        .upsert(
          { key: entry.key, value: entry.value, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (loading) {
    return (
      <div className="p-8 bg-sand-light min-h-screen">
        <p className="text-mani-taupe">Loading legal texts...</p>
      </div>
    );
  }

  return (
    <div className="p-8 bg-sand-light min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand">Privacy Policy & Terms</h1>
        <p className="text-sm text-mani-taupe mt-1">
          Edit your privacy policy and terms of service. These are shown to app users and linked in the App Store.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        <button
          onClick={() => setActiveTab('privacy')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'privacy'
              ? 'bg-brand text-sand'
              : 'bg-sand text-mani-brown hover:bg-sand-dark'
          }`}
        >
          Privacy Policy
        </button>
        <button
          onClick={() => setActiveTab('terms')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'terms'
              ? 'bg-brand text-sand'
              : 'bg-sand text-mani-brown hover:bg-sand-dark'
          }`}
        >
          Terms of Service
        </button>
      </div>

      <form onSubmit={handleSave}>
        <div className="bg-mani-cream rounded-xl border border-sand p-6">
          {activeTab === 'privacy' ? (
            <div>
              <label className="block text-sm font-medium text-mani-brown mb-2">
                Privacy Policy (Markdown)
              </label>
              <textarea
                value={privacyPolicy}
                onChange={(e) => setPrivacyPolicy(e.target.value)}
                rows={20}
                className="w-full px-4 py-3 border border-sand rounded-lg text-sm focus:ring-2 focus:ring-accent outline-none bg-sand-light font-mono leading-relaxed resize-y"
                placeholder="Enter your privacy policy in Markdown format..."
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-mani-brown mb-2">
                Terms of Service (Markdown)
              </label>
              <textarea
                value={termsOfService}
                onChange={(e) => setTermsOfService(e.target.value)}
                rows={20}
                className="w-full px-4 py-3 border border-sand rounded-lg text-sm focus:ring-2 focus:ring-accent outline-none bg-sand-light font-mono leading-relaxed resize-y"
                placeholder="Enter your terms of service in Markdown format..."
              />
            </div>
          )}

          {/* Info box */}
          <div className="bg-sand/30 rounded-lg p-4 border border-sand mt-4">
            <p className="text-xs text-mani-brown leading-relaxed">
              <strong>Tip:</strong> Use Markdown formatting — <code># Heading</code>, <code>## Subheading</code>, <code>**bold**</code>, <code>- list items</code>.
              These texts are displayed on a public page linked from the app and App Store.
            </p>
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-3 mt-6">
            <button
              type="submit"
              disabled={saving}
              className="bg-accent text-brand px-6 py-2.5 rounded-lg font-medium text-sm disabled:opacity-50 hover:bg-accent-dark transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            {saved && (
              <span className="text-sm text-green-700 font-medium">
                Texts saved
              </span>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
