import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface PricingSettings {
  late_cancellation_fee_dkk: number;
  no_show_fee_dkk: number;
}

const DEFAULT_SETTINGS: PricingSettings = {
  late_cancellation_fee_dkk: 0,
  no_show_fee_dkk: 0,
};

export default function PricingPage() {
  const [settings, setSettings] = useState<PricingSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    const { data } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['late_cancellation_fee_dkk', 'no_show_fee_dkk']);

    if (data && data.length > 0) {
      const mapped: any = { ...DEFAULT_SETTINGS };
      for (const row of data) {
        mapped[row.key] = parseFloat(row.value) || 0;
      }
      setSettings(mapped);
    }
    setLoading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    const entries = [
      { key: 'late_cancellation_fee_dkk', value: String(settings.late_cancellation_fee_dkk) },
      { key: 'no_show_fee_dkk', value: String(settings.no_show_fee_dkk) },
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
        <p className="text-mani-taupe">Loading pricing settings...</p>
      </div>
    );
  }

  return (
    <div className="p-8 bg-sand-light min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand">Pricing</h1>
        <p className="text-sm text-mani-taupe mt-1">
          Set fees for late cancellations and no-shows
        </p>
      </div>

      <div className="bg-mani-cream rounded-xl border border-sand p-6 max-w-lg">
        <form onSubmit={handleSave} className="space-y-6">
          {/* Late Cancellation Fee */}
          <div>
            <label className="block text-sm font-medium text-mani-brown mb-1">
              Late Cancellation Fee
            </label>
            <div className="relative">
              <input
                type="number"
                step="1"
                min="0"
                value={settings.late_cancellation_fee_dkk}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    late_cancellation_fee_dkk: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2.5 pr-14 border border-sand rounded-lg text-sm focus:ring-2 focus:ring-accent outline-none bg-sand-light"
                placeholder="0"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-mani-taupe">
                DKK
              </span>
            </div>
            <p className="text-xs text-mani-taupe mt-1.5">
              Charged when a user cancels less than 4 hours before class start.
            </p>
          </div>

          {/* No-Show Fee */}
          <div>
            <label className="block text-sm font-medium text-mani-brown mb-1">
              No-Show Fee
            </label>
            <div className="relative">
              <input
                type="number"
                step="1"
                min="0"
                value={settings.no_show_fee_dkk}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    no_show_fee_dkk: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2.5 pr-14 border border-sand rounded-lg text-sm focus:ring-2 focus:ring-accent outline-none bg-sand-light"
                placeholder="0"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-mani-taupe">
                DKK
              </span>
            </div>
            <p className="text-xs text-mani-taupe mt-1.5">
              Charged when a user doesn't show up for a booked class.
            </p>
          </div>

          {/* Info box */}
          <div className="bg-sand/30 rounded-lg p-4 border border-sand">
            <p className="text-xs text-mani-brown leading-relaxed">
              <strong>Note:</strong> These fees are displayed to users when they cancel late or are marked as a no-show.
              Actual payment collection should be handled through your billing system.
              Setting a fee to 0 DKK disables that particular charge.
            </p>
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-accent text-brand px-6 py-2.5 rounded-lg font-medium text-sm disabled:opacity-50 hover:bg-accent-dark transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            {saved && (
              <span className="text-sm text-green-700 font-medium">
                Settings saved
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
