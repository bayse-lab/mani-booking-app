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

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-mani-brown mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-sand rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none bg-sand-light"
        required={required}
        placeholder={placeholder}
      />
    </div>
  );
}

export default function CentersPage() {
  const [centers, setCenters] = useState<Center[]>([]);
  const [stats, setStats] = useState<Record<string, CenterStats>>({});
  const [loading, setLoading] = useState(true);

  // Add/Edit modal
  const [editCenter, setEditCenter] = useState<Center | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    address: '',
    city: '',
    postal_code: '',
    phone: '',
    email: '',
    reformer_count: '0',
  });
  const [saving, setSaving] = useState(false);

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

    // Fetch stats for each center
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

  // --- Add/Edit ---
  function openAddModal() {
    setEditCenter(null);
    setForm({
      name: '',
      address: '',
      city: '',
      postal_code: '',
      phone: '',
      email: '',
      reformer_count: '0',
    });
    setShowAddModal(true);
  }

  function openEditModal(center: Center) {
    setEditCenter(center);
    setForm({
      name: center.name,
      address: center.address || '',
      city: center.city || '',
      postal_code: center.postal_code || '',
      phone: center.phone || '',
      email: center.email || '',
      reformer_count: String(center.reformer_count),
    });
    setShowAddModal(true);
  }

  async function saveCenter() {
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

    if (editCenter) {
      await supabase.from('centers').update(payload).eq('id', editCenter.id);
    } else {
      await supabase.from('centers').insert(payload);
    }

    setSaving(false);
    setShowAddModal(false);
    setEditCenter(null);
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
        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-accent text-brand text-sm font-medium rounded-lg hover:bg-accent-dark transition-colors"
        >
          + Add Center
        </button>
      </div>

      {/* Centers Table */}
      <div className="bg-mani-cream rounded-xl border border-sand overflow-hidden">
        <table className="w-full">
          <thead className="bg-sand-light border-b border-sand">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-mani-brown uppercase tracking-wide">Name</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-mani-brown uppercase tracking-wide">City</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-mani-brown uppercase tracking-wide">Reformers</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-mani-brown uppercase tracking-wide">Members</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-mani-brown uppercase tracking-wide">Instructors</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-mani-brown uppercase tracking-wide">Status</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-mani-brown uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand/60">
            {centers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-mani-taupe text-sm">
                  No centers yet
                </td>
              </tr>
            ) : (
              centers.map((center) => {
                const s = stats[center.id];
                return (
                  <tr key={center.id} className="hover:bg-sand-light/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-brand">{center.name}</td>
                    <td className="px-6 py-4 text-sm text-mani-brown">{center.city || '-'}</td>
                    <td className="px-6 py-4 text-sm text-mani-brown">{center.reformer_count}</td>
                    <td className="px-6 py-4 text-sm text-mani-brown">{s?.membersCount ?? '...'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-mani-brown">
                          {s ? s.instructors.length : '...'}
                        </span>
                        <button
                          onClick={() => openInstructorModal(center)}
                          className="text-xs text-accent hover:text-accent-dark font-medium"
                        >
                          Manage
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-medium ${
                          center.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {center.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => openEditModal(center)}
                          className="text-sm text-accent hover:text-accent-dark font-medium transition-colors"
                        >
                          Edit
                        </button>
                        <span className="text-sand-dark">|</span>
                        <button
                          onClick={() => toggleActive(center)}
                          className={`text-sm font-medium transition-colors hover:underline ${
                            center.is_active ? 'text-mani-tierRed' : 'text-green-600'
                          }`}
                        >
                          {center.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ======= Add/Edit Center Modal ======= */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-mani-cream rounded-2xl w-full max-w-lg mx-4 p-6 max-h-[85vh] overflow-auto border border-sand">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-brand">
                {editCenter ? 'Edit Center' : 'Add Center'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditCenter(null);
                }}
                className="text-mani-taupe hover:text-brand text-xl leading-none"
              >
                &times;
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveCenter();
              }}
              className="space-y-3"
            >
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
              <div className="grid grid-cols-2 gap-3">
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
              </div>
              <div className="grid grid-cols-2 gap-3">
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
              </div>
              <Field
                label="Reformer Count"
                value={form.reformer_count}
                onChange={(v) => setForm({ ...form, reformer_count: v })}
                type="number"
                placeholder="0"
              />

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditCenter(null);
                  }}
                  className="px-4 py-2 text-sm text-mani-brown hover:text-brand transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-accent text-brand text-sm font-medium rounded-lg hover:bg-accent-dark disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : editCenter ? 'Save Changes' : 'Create Center'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======= Manage Instructors Modal ======= */}
      {instructorCenter && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-mani-cream rounded-2xl w-full max-w-lg mx-4 p-6 max-h-[85vh] overflow-auto border border-sand">
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
                          className="flex items-center justify-between py-2.5 px-3 bg-sand-light rounded-lg border border-sand"
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
                          className="flex items-center justify-between py-2.5 px-3 bg-sand-light rounded-lg border border-sand"
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
