import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface MembershipType {
  id: string;
  name: string;
  description: string | null;
  monthly_price_dkk: number | null;
  max_bookings_ahead: number | null;
  allowed_class_times: string[] | null;
  required_fields: string[];
  discount_type: string | null;
  discount_value: number | null;
  discount_label: string | null;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  sort_order: number;
  is_active: boolean;
}

const REQUIRED_FIELD_OPTIONS = [
  { value: 'phone', label: 'Phone' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'address_line1', label: 'Address' },
  { value: 'city', label: 'City' },
  { value: 'postal_code', label: 'Postal Code' },
];

const DISCOUNT_TYPES = [
  { value: '', label: 'No discount' },
  { value: 'percentage', label: 'Percentage (%)' },
  { value: 'fixed_amount', label: 'Fixed amount (DKK)' },
  { value: 'free_months', label: 'Free months' },
];

const emptyForm = {
  name: '',
  description: '',
  monthly_price_dkk: '',
  max_bookings_ahead: '',
  allowed_class_times: '',
  required_fields: [] as string[],
  discount_type: '',
  discount_value: '',
  discount_label: '',
  sort_order: '0',
  is_active: true,
};

export default function MemberTypesPage() {
  const [types, setTypes] = useState<MembershipType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchTypes();
  }, []);

  async function fetchTypes() {
    const { data } = await supabase
      .from('membership_types')
      .select('*')
      .order('sort_order')
      .order('name');
    setTypes((data ?? []) as MembershipType[]);
    setLoading(false);
  }

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setShowForm(true);
  }

  function openEdit(t: MembershipType) {
    setEditingId(t.id);
    setForm({
      name: t.name,
      description: t.description || '',
      monthly_price_dkk: t.monthly_price_dkk != null ? String(t.monthly_price_dkk) : '',
      max_bookings_ahead: t.max_bookings_ahead != null ? String(t.max_bookings_ahead) : '',
      allowed_class_times: t.allowed_class_times ? t.allowed_class_times.join(', ') : '',
      required_fields: t.required_fields || [],
      discount_type: t.discount_type || '',
      discount_value: t.discount_value != null ? String(t.discount_value) : '',
      discount_label: t.discount_label || '',
      sort_order: String(t.sort_order),
      is_active: t.is_active,
    });
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      monthly_price_dkk: form.monthly_price_dkk ? parseFloat(form.monthly_price_dkk) : null,
      max_bookings_ahead: form.max_bookings_ahead ? parseInt(form.max_bookings_ahead) : null,
      allowed_class_times: form.allowed_class_times.trim()
        ? form.allowed_class_times.split(',').map((s) => s.trim()).filter(Boolean)
        : null,
      required_fields: form.required_fields,
      discount_type: form.discount_type || null,
      discount_value: form.discount_value ? parseFloat(form.discount_value) : null,
      discount_label: form.discount_label.trim() || null,
      sort_order: parseInt(form.sort_order) || 0,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    };

    let savedId = editingId;

    if (editingId) {
      await supabase.from('membership_types').update(payload).eq('id', editingId);
    } else {
      const { data } = await supabase.from('membership_types').insert(payload).select('id').single();
      savedId = data?.id ?? null;
    }

    setSaving(false);

    // Auto-sync with Stripe if there's a price set
    if (savedId && payload.monthly_price_dkk && payload.monthly_price_dkk > 0) {
      setSyncing(true);
      try {
        const { data: fnData, error: fnError } = await supabase.functions.invoke('sync-stripe-product', {
          body: { membershipTypeId: savedId },
        });
        if (fnError) {
          console.error('Stripe sync error:', fnError);
          const msg = fnError instanceof Error ? fnError.message : JSON.stringify(fnError);
          alert(`Saved, but Stripe sync failed: ${msg}`);
        } else if (fnData?.error) {
          console.error('Stripe sync returned error:', fnData.error);
          alert(`Saved, but Stripe sync failed: ${fnData.error}`);
        }
      } catch (err) {
        console.error('Stripe sync catch error:', err);
        alert(`Saved, but Stripe sync failed: ${(err as Error).message}`);
      }
      setSyncing(false);
    } else {
      console.log('Stripe sync skipped:', { savedId, price: payload.monthly_price_dkk });
    }

    setShowForm(false);
    fetchTypes();
  }

  async function toggleActive(t: MembershipType) {
    await supabase
      .from('membership_types')
      .update({ is_active: !t.is_active, updated_at: new Date().toISOString() })
      .eq('id', t.id);
    fetchTypes();
  }

  function toggleRequiredField(field: string) {
    setForm((prev) => ({
      ...prev,
      required_fields: prev.required_fields.includes(field)
        ? prev.required_fields.filter((f) => f !== field)
        : [...prev.required_fields, field],
    }));
  }

  if (loading) {
    return (
      <div className="p-8 bg-sand-light min-h-screen">
        <p className="text-mani-taupe">Loading membership types...</p>
      </div>
    );
  }

  return (
    <div className="p-8 bg-sand-light min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-brand">Member Types</h1>
        <button
          onClick={openCreate}
          className="bg-accent text-brand px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-dark transition-colors"
        >
          + Add Type
        </button>
      </div>

      {/* Types Table */}
      {types.length === 0 ? (
        <div className="bg-mani-cream rounded-xl border border-sand p-8 text-center">
          <p className="text-mani-taupe">No membership types yet</p>
        </div>
      ) : (
        <div className="bg-mani-cream rounded-xl border border-sand-dark/20 overflow-hidden">
          <table className="w-full">
            <thead className="bg-sand/30 border-b border-sand-dark/20">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-mani-brown uppercase tracking-wide">
                  Name
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-mani-brown uppercase tracking-wide">
                  Price / mo
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-mani-brown uppercase tracking-wide">
                  Max Bookings
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-mani-brown uppercase tracking-wide">
                  Discount
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-mani-brown uppercase tracking-wide">
                  Stripe
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-mani-brown uppercase tracking-wide">
                  Active
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-mani-brown uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand/40">
              {types.map((t) => (
                <tr key={t.id} className={`hover:bg-sand/10 transition-colors ${!t.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-6 py-4">
                    <div>
                      <span className="text-sm font-medium text-brand">{t.name}</span>
                      {t.description && (
                        <p className="text-xs text-mani-taupe mt-0.5">{t.description}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-brand">
                    {t.monthly_price_dkk != null ? `${t.monthly_price_dkk} DKK` : '\u2013'}
                  </td>
                  <td className="px-6 py-4 text-sm text-mani-brown">
                    {t.max_bookings_ahead != null ? t.max_bookings_ahead : 'Unlimited'}
                  </td>
                  <td className="px-6 py-4 text-sm text-mani-brown">
                    {t.discount_label || '\u2013'}
                  </td>
                  <td className="px-6 py-4">
                    {t.stripe_price_id ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        Synced
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-mani-taupe bg-sand/40 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-sand-dark" />
                        —
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleActive(t)}
                      className={`w-10 h-5 rounded-full relative transition-colors focus:outline-none ${
                        t.is_active ? 'bg-green-500' : 'bg-sand-dark'
                      }`}
                    >
                      <span
                        className={`block absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          t.is_active ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => openEdit(t)}
                      className="text-sm text-accent hover:text-accent-dark font-medium transition-colors"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-mani-cream rounded-2xl w-full max-w-lg mx-4 p-6 max-h-[85vh] overflow-auto border border-sand">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-brand">
                {editingId ? 'Edit Member Type' : 'Add Member Type'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-mani-taupe hover:text-brand text-xl leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-mani-brown mb-1">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-sand rounded-lg text-sm focus:ring-2 focus:ring-accent outline-none bg-sand-light"
                  required
                  placeholder="e.g. Standard, Premium, Founder"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-mani-brown mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border border-sand rounded-lg text-sm focus:ring-2 focus:ring-accent outline-none bg-sand-light"
                  rows={2}
                  placeholder="Short description of this membership type"
                />
              </div>

              {/* Price + Max Bookings */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-mani-brown mb-1">Monthly Price (DKK)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.monthly_price_dkk}
                    onChange={(e) => setForm({ ...form, monthly_price_dkk: e.target.value })}
                    className="w-full px-3 py-2 border border-sand rounded-lg text-sm focus:ring-2 focus:ring-accent outline-none bg-sand-light"
                    placeholder="e.g. 599"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-mani-brown mb-1">Max Bookings Ahead</label>
                  <input
                    type="number"
                    value={form.max_bookings_ahead}
                    onChange={(e) => setForm({ ...form, max_bookings_ahead: e.target.value })}
                    className="w-full px-3 py-2 border border-sand rounded-lg text-sm focus:ring-2 focus:ring-accent outline-none bg-sand-light"
                    placeholder="Empty = unlimited"
                  />
                </div>
              </div>

              {/* Allowed Class Times */}
              <div>
                <label className="block text-sm font-medium text-mani-brown mb-1">Allowed Class Times</label>
                <input
                  type="text"
                  value={form.allowed_class_times}
                  onChange={(e) => setForm({ ...form, allowed_class_times: e.target.value })}
                  className="w-full px-3 py-2 border border-sand rounded-lg text-sm focus:ring-2 focus:ring-accent outline-none bg-sand-light"
                  placeholder="e.g. 06:00-09:00, 17:00-21:00 (empty = all)"
                />
                <p className="text-xs text-mani-taupe mt-1">Comma-separated time ranges. Leave empty for all times.</p>
              </div>

              {/* Required Fields */}
              <div>
                <label className="block text-sm font-medium text-mani-brown mb-1">Required Fields</label>
                <div className="flex flex-wrap gap-2">
                  {REQUIRED_FIELD_OPTIONS.map((opt) => {
                    const isSelected = form.required_fields.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleRequiredField(opt.value)}
                        className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${
                          isSelected
                            ? 'bg-accent text-brand border-accent'
                            : 'bg-sand-light text-mani-brown border-sand hover:border-accent'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Discount Section */}
              <div className="border-t border-sand pt-4">
                <p className="text-xs font-medium text-mani-brown uppercase tracking-wide mb-3">Discount</p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-mani-brown mb-1">Type</label>
                    <select
                      value={form.discount_type}
                      onChange={(e) => setForm({ ...form, discount_type: e.target.value })}
                      className="w-full px-3 py-2 border border-sand rounded-lg text-sm focus:ring-2 focus:ring-accent outline-none bg-sand-light"
                    >
                      {DISCOUNT_TYPES.map((dt) => (
                        <option key={dt.value} value={dt.value}>
                          {dt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-mani-brown mb-1">Value</label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.discount_value}
                      onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                      className="w-full px-3 py-2 border border-sand rounded-lg text-sm focus:ring-2 focus:ring-accent outline-none bg-sand-light"
                      placeholder="e.g. 20"
                      disabled={!form.discount_type}
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block text-sm font-medium text-mani-brown mb-1">Discount Label</label>
                  <input
                    type="text"
                    value={form.discount_label}
                    onChange={(e) => setForm({ ...form, discount_label: e.target.value })}
                    className="w-full px-3 py-2 border border-sand rounded-lg text-sm focus:ring-2 focus:ring-accent outline-none bg-sand-light"
                    placeholder="e.g. Founder member - always half price"
                  />
                </div>
              </div>

              {/* Stripe Integration — auto-synced */}
              {editingId && (() => {
                const currentType = types.find((t) => t.id === editingId);
                return currentType?.stripe_price_id ? (
                  <div className="border-t border-sand pt-4">
                    <p className="text-xs font-medium text-mani-brown uppercase tracking-wide mb-3">Stripe Integration</p>
                    <div className="bg-sand/30 rounded-lg p-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-xs text-mani-brown font-medium">Synced with Stripe</span>
                      </div>
                      <p className="text-xs text-mani-taupe font-mono">
                        Product: {currentType.stripe_product_id || '—'}
                      </p>
                      <p className="text-xs text-mani-taupe font-mono">
                        Price: {currentType.stripe_price_id}
                      </p>
                    </div>
                    <p className="text-xs text-mani-taupe mt-2">
                      Stripe product and price are auto-synced when you save. If you change the monthly price, a new Stripe Price will be created automatically.
                    </p>
                  </div>
                ) : (
                  <div className="border-t border-sand pt-4">
                    <p className="text-xs font-medium text-mani-brown uppercase tracking-wide mb-3">Stripe Integration</p>
                    <div className="bg-sand/30 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-sand-dark" />
                        <span className="text-xs text-mani-taupe">Not synced — will sync automatically when saved with a monthly price.</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Sort Order + Active */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-mani-brown mb-1">Sort Order</label>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                    className="w-full px-3 py-2 border border-sand rounded-lg text-sm focus:ring-2 focus:ring-accent outline-none bg-sand-light"
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                      className="w-4 h-4 accent-accent"
                    />
                    <span className="text-sm text-mani-brown">Active</span>
                  </label>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={saving || syncing}
                  className="flex-1 bg-accent text-brand py-2.5 rounded-lg font-medium text-sm disabled:opacity-50 hover:bg-accent-dark transition-colors"
                >
                  {syncing ? 'Syncing with Stripe...' : saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Type'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-sand-light text-mani-brown py-2.5 rounded-lg font-medium text-sm border border-sand hover:bg-sand/30 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
