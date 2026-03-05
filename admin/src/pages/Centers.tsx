import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Center {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  reformer_count: number;
  created_at: string;
}

interface CenterStats {
  membersCount: number;
  instructors: { id: string; full_name: string | null; email: string }[];
}

interface InstructorProfile {
  id: string;
  full_name: string | null;
  email: string;
}

interface CenterForm {
  name: string;
  address: string;
  city: string;
  postal_code: string;
  phone: string;
  email: string;
  reformer_count: string;
}

function emptyForm(): CenterForm {
  return { name: '', address: '', city: '', postal_code: '', phone: '', email: '', reformer_count: '0' };
}

function centerToForm(c: Center): CenterForm {
  return {
    name: c.name,
    address: c.address || '',
    city: c.city || '',
    postal_code: c.postal_code || '',
    phone: c.phone || '',
    email: c.email || '',
    reformer_count: String(c.reformer_count),
  };
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  placeholder,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-mani-warmGrey uppercase tracking-wide mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-sand rounded text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none bg-sand-light disabled:opacity-50 disabled:cursor-not-allowed"
        required={required}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-mani-warmGrey uppercase tracking-wide mb-0.5">
        {label}
      </dt>
      <dd className="text-sm text-brand">{value || '—'}</dd>
    </div>
  );
}

export default function CentersPage() {
  const [centers, setCenters] = useState<Center[]>([]);
  const [stats, setStats] = useState<Record<string, CenterStats>>({});
  const [loading, setLoading] = useState(true);

  // Editing state — which center is in edit mode
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CenterForm>(emptyForm());
  const [saving, setSaving] = useState(false);

  // Adding new center
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<CenterForm>(emptyForm());
  const [addSaving, setAddSaving] = useState(false);

  // Instructor management modal
  const [instructorCenter, setInstructorCenter] = useState<Center | null>(null);
  const [centerInstructors, setCenterInstructors] = useState<InstructorProfile[]>([]);
  const [availableInstructors, setAvailableInstructors] = useState<InstructorProfile[]>([]);
  const [loadingInstructors, setLoadingInstructors] = useState(false);

  useEffect(() => {
    fetchCenters();
  }, []);

  async function fetchCenters() {
    const { data } = await supabase
      .from('centers')
      .select('*')
      .order('name');
    const centersData = (data ?? []) as Center[];
    setCenters(centersData);
    setLoading(false);

    const statsMap: Record<string, CenterStats> = {};
    for (const center of centersData) {
      const [membersResult, instructorsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('center_id', center.id)
          .eq('role', 'member'),
        supabase
          .from('instructor_centers')
          .select('instructor_id, profiles:instructor_id(id, full_name, email)')
          .eq('center_id', center.id),
      ]);

      statsMap[center.id] = {
        membersCount: membersResult.count ?? 0,
        instructors: (instructorsResult.data ?? []).map((row: any) => ({
          id: row.profiles.id,
          full_name: row.profiles.full_name,
          email: row.profiles.email,
        })),
      };
    }
    setStats(statsMap);
  }

  // --- Inline Edit ---
  function startEditing(center: Center) {
    setEditingId(center.id);
    setForm(centerToForm(center));
  }

  function cancelEditing() {
    setEditingId(null);
    setForm(emptyForm());
  }

  async function saveEditing(centerId: string) {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      postal_code: form.postal_code.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      reformer_count: parseInt(form.reformer_count) || 0,
    };
    await supabase.from('centers').update(payload).eq('id', centerId);
    setSaving(false);
    setEditingId(null);
    fetchCenters();
  }

  // --- Add New ---
  function openAddForm() {
    setAddForm(emptyForm());
    setShowAddForm(true);
  }

  async function saveNewCenter() {
    if (!addForm.name.trim()) return;
    setAddSaving(true);
    const payload = {
      name: addForm.name.trim(),
      address: addForm.address.trim() || null,
      city: addForm.city.trim() || null,
      postal_code: addForm.postal_code.trim() || null,
      phone: addForm.phone.trim() || null,
      email: addForm.email.trim() || null,
      reformer_count: parseInt(addForm.reformer_count) || 0,
    };
    await supabase.from('centers').insert(payload);
    setAddSaving(false);
    setShowAddForm(false);
    fetchCenters();
  }

  async function toggleActive(center: Center) {
    await supabase
      .from('centers')
      .update({ is_active: !center.is_active })
      .eq('id', center.id);
    fetchCenters();
  }

  // --- Instructor management ---
  async function openInstructorModal(center: Center) {
    setInstructorCenter(center);
    setLoadingInstructors(true);

    const [currentResult, allInstructorsResult] = await Promise.all([
      supabase
        .from('instructor_centers')
        .select('instructor_id, profiles:instructor_id(id, full_name, email)')
        .eq('center_id', center.id),
      supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'instructor')
        .order('full_name'),
    ]);

    const current = (currentResult.data ?? []).map((row: any) => ({
      id: row.profiles.id,
      full_name: row.profiles.full_name,
      email: row.profiles.email,
    }));
    setCenterInstructors(current);

    const currentIds = new Set(current.map((i: InstructorProfile) => i.id));
    setAvailableInstructors(
      ((allInstructorsResult.data ?? []) as InstructorProfile[]).filter(
        (i) => !currentIds.has(i.id)
      )
    );

    setLoadingInstructors(false);
  }

  async function addInstructor(instructorId: string) {
    if (!instructorCenter) return;
    await supabase.from('instructor_centers').insert({
      instructor_id: instructorId,
      center_id: instructorCenter.id,
    });
    openInstructorModal(instructorCenter);
    fetchCenters();
  }

  async function removeInstructor(instructorId: string) {
    if (!instructorCenter) return;
    await supabase
      .from('instructor_centers')
      .delete()
      .eq('instructor_id', instructorId)
      .eq('center_id', instructorCenter.id);
    openInstructorModal(instructorCenter);
    fetchCenters();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-sand-light p-8">
        <p className="text-mani-taupe">Loading centers...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand-light p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-brand">Centers ({centers.length})</h1>
        {!showAddForm && (
          <button
            onClick={openAddForm}
            className="px-4 py-2 bg-accent text-brand text-sm font-medium rounded hover:bg-accent-dark transition-colors"
          >
            + Add Center
          </button>
        )}
      </div>

      {/* ======= Add New Center Form ======= */}
      {showAddForm && (
        <div className="bg-mani-cream rounded border border-sand p-6 mb-6">
          <h2 className="text-lg font-semibold text-brand mb-4">New Center</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveNewCenter();
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
              <Field
                label="Name"
                value={addForm.name}
                onChange={(v) => setAddForm({ ...addForm, name: v })}
                required
                placeholder="Center name"
              />
              <Field
                label="Address"
                value={addForm.address}
                onChange={(v) => setAddForm({ ...addForm, address: v })}
                placeholder="Street address"
              />
              <Field
                label="City"
                value={addForm.city}
                onChange={(v) => setAddForm({ ...addForm, city: v })}
                placeholder="City"
              />
              <Field
                label="Postal Code"
                value={addForm.postal_code}
                onChange={(v) => setAddForm({ ...addForm, postal_code: v })}
                placeholder="0000"
              />
              <Field
                label="Phone"
                value={addForm.phone}
                onChange={(v) => setAddForm({ ...addForm, phone: v })}
                type="tel"
                placeholder="+45 ..."
              />
              <Field
                label="Email"
                value={addForm.email}
                onChange={(v) => setAddForm({ ...addForm, email: v })}
                type="email"
                placeholder="center@example.com"
              />
              <Field
                label="Reformer Count"
                value={addForm.reformer_count}
                onChange={(v) => setAddForm({ ...addForm, reformer_count: v })}
                type="number"
                placeholder="0"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-sm text-mani-brown hover:text-brand transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addSaving}
                className="px-5 py-2 bg-accent text-brand text-sm font-medium rounded hover:bg-accent-dark disabled:opacity-50 transition-colors"
              >
                {addSaving ? 'Creating...' : 'Create Center'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======= Center Cards ======= */}
      <div className="space-y-4">
        {centers.length === 0 && !showAddForm ? (
          <div className="bg-mani-cream rounded border border-sand px-6 py-12 text-center">
            <p className="text-mani-taupe text-sm">No centers yet</p>
          </div>
        ) : (
          centers.map((center) => {
            const s = stats[center.id];
            const isEditing = editingId === center.id;

            return (
              <div
                key={center.id}
                className="bg-mani-cream rounded border border-sand overflow-hidden"
              >
                {/* Card header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-sand bg-sand-light/50">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-brand">
                      {isEditing ? form.name || 'Untitled' : center.name}
                    </h2>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-medium ${
                        center.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {center.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isEditing ? (
                      <>
                        <button
                          onClick={() => startEditing(center)}
                          className="px-3 py-1.5 text-sm text-accent hover:text-accent-dark font-medium transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleActive(center)}
                          className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                            center.is_active
                              ? 'text-mani-tierRed hover:underline'
                              : 'text-green-600 hover:underline'
                          }`}
                        >
                          {center.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={cancelEditing}
                          className="px-3 py-1.5 text-sm text-mani-brown hover:text-brand transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => saveEditing(center.id)}
                          disabled={saving}
                          className="px-4 py-1.5 bg-accent text-brand text-sm font-medium rounded hover:bg-accent-dark disabled:opacity-50 transition-colors"
                        >
                          {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Card body */}
                <div className="px-6 py-5">
                  {isEditing ? (
                    /* --- Edit Mode --- */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <Field
                        label="Name"
                        value={form.name}
                        onChange={(v) => setForm({ ...form, name: v })}
                        required
                        placeholder="Center name"
                      />
                      <Field
                        label="Address"
                        value={form.address}
                        onChange={(v) => setForm({ ...form, address: v })}
                        placeholder="Street address"
                      />
                      <Field
                        label="City"
                        value={form.city}
                        onChange={(v) => setForm({ ...form, city: v })}
                        placeholder="City"
                      />
                      <Field
                        label="Postal Code"
                        value={form.postal_code}
                        onChange={(v) => setForm({ ...form, postal_code: v })}
                        placeholder="0000"
                      />
                      <Field
                        label="Phone"
                        value={form.phone}
                        onChange={(v) => setForm({ ...form, phone: v })}
                        type="tel"
                        placeholder="+45 ..."
                      />
                      <Field
                        label="Email"
                        value={form.email}
                        onChange={(v) => setForm({ ...form, email: v })}
                        type="email"
                        placeholder="center@example.com"
                      />
                      <Field
                        label="Reformer Count"
                        value={form.reformer_count}
                        onChange={(v) => setForm({ ...form, reformer_count: v })}
                        type="number"
                        placeholder="0"
                      />
                    </div>
                  ) : (
                    /* --- Read Mode --- */
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-4">
                      <ReadOnlyField label="Address" value={center.address || ''} />
                      <ReadOnlyField label="City" value={center.city || ''} />
                      <ReadOnlyField label="Postal Code" value={center.postal_code || ''} />
                      <ReadOnlyField label="Phone" value={center.phone || ''} />
                      <ReadOnlyField label="Email" value={center.email || ''} />
                      <ReadOnlyField label="Reformer Count" value={String(center.reformer_count)} />
                      <ReadOnlyField
                        label="Members"
                        value={s ? String(s.membersCount) : '...'}
                      />
                      <div>
                        <dt className="text-xs font-medium text-mani-warmGrey uppercase tracking-wide mb-0.5">
                          Instructors
                        </dt>
                        <dd className="flex items-center gap-2">
                          <span className="text-sm text-brand">
                            {s ? s.instructors.length : '...'}
                          </span>
                          <button
                            onClick={() => openInstructorModal(center)}
                            className="text-xs text-accent hover:text-accent-dark font-medium"
                          >
                            Manage
                          </button>
                        </dd>
                      </div>
                    </div>
                  )}
                </div>

                {/* Instructor names preview (read mode only) */}
                {!isEditing && s && s.instructors.length > 0 && (
                  <div className="px-6 pb-4">
                    <div className="flex flex-wrap gap-1.5">
                      {s.instructors.map((inst) => (
                        <span
                          key={inst.id}
                          className="text-xs px-2 py-0.5 rounded bg-sand-light border border-sand text-mani-brown"
                        >
                          {inst.full_name || inst.email}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ======= Manage Instructors Modal ======= */}
      {instructorCenter && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-mani-cream rounded w-full max-w-lg mx-4 p-6 max-h-[85vh] overflow-auto border border-sand">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-brand">Manage Instructors</h2>
                <p className="text-sm text-mani-brown">{instructorCenter.name}</p>
              </div>
              <button
                onClick={() => setInstructorCenter(null)}
                className="text-mani-taupe hover:text-brand text-xl leading-none"
              >
                &times;
              </button>
            </div>

            {loadingInstructors ? (
              <p className="text-mani-taupe text-sm">Loading...</p>
            ) : (
              <>
                {/* Current instructors */}
                <div className="mb-6">
                  <h3 className="text-xs font-medium text-mani-brown uppercase tracking-wide mb-3">
                    Current Instructors ({centerInstructors.length})
                  </h3>
                  {centerInstructors.length === 0 ? (
                    <p className="text-sm text-mani-taupe">No instructors assigned</p>
                  ) : (
                    <div className="space-y-2">
                      {centerInstructors.map((inst) => (
                        <div
                          key={inst.id}
                          className="flex items-center justify-between py-2.5 px-3 bg-sand-light rounded border border-sand"
                        >
                          <div>
                            <p className="text-sm font-medium text-brand">
                              {inst.full_name || 'Unnamed'}
                            </p>
                            <p className="text-xs text-mani-taupe">{inst.email}</p>
                          </div>
                          <button
                            onClick={() => removeInstructor(inst.id)}
                            className="text-xs text-mani-tierRed hover:text-mani-tierRed font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Available instructors */}
                {availableInstructors.length > 0 && (
                  <div>
                    <h3 className="text-xs font-medium text-mani-brown uppercase tracking-wide mb-3">
                      Add Instructor
                    </h3>
                    <div className="space-y-2">
                      {availableInstructors.map((inst) => (
                        <div
                          key={inst.id}
                          className="flex items-center justify-between py-2.5 px-3 bg-sand-light rounded border border-sand"
                        >
                          <div>
                            <p className="text-sm font-medium text-brand">
                              {inst.full_name || 'Unnamed'}
                            </p>
                            <p className="text-xs text-mani-taupe">{inst.email}</p>
                          </div>
                          <button
                            onClick={() => addInstructor(inst.id)}
                            className="text-xs text-accent hover:text-accent-dark font-medium"
                          >
                            + Add
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setInstructorCenter(null)}
                className="px-4 py-2 text-sm text-mani-brown hover:text-brand transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
