import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useCenterContext } from '../App';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  birthday: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postal_code: string | null;
  center_id: string | null;
  membership_type_id: string | null;
  created_at: string;
}

interface MembershipType {
  id: string;
  name: string;
}

interface Center {
  id: string;
  name: string;
}

interface InstructorCenter {
  center_id: string;
}

interface UserBooking {
  id: string;
  status: string;
  booked_at: string;
  class_instances: {
    start_time: string;
    class_definitions: { name: string };
  };
}

function Field({ label, value, onChange, type = 'text', required = false, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-mani-brown mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-sand rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none bg-sand-light"
        required={required} placeholder={placeholder} />
    </div>
  );
}

function calculateAge(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const birth = new Date(dateStr);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function AgeBadge({ birthday }: { birthday: string | null }) {
  const age = calculateAge(birthday);
  if (age === null) return <span className="text-sm text-mani-taupe">-</span>;
  const isUnder30 = age < 30;
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-sm">{age}</span>
      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
        isUnder30
          ? 'bg-green-100 text-green-700'
          : 'bg-sand text-mani-brown'
      }`}>
        {isUnder30 ? 'Under 30' : '30+'}
      </span>
    </span>
  );
}

export default function UsersPage() {
  const { selectedCenter } = useCenterContext();
  const [users, setUsers] = useState<User[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [membershipTypes, setMembershipTypes] = useState<MembershipType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Edit modal
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: '', phone: '', role: 'member',
    address_line1: '', address_line2: '', city: '', postal_code: '', birthday: '',
    center_id: '', membership_type_id: '',
  });
  const [editInstructorCenterIds, setEditInstructorCenterIds] = useState<string[]>([]);
  const [editSaving, setEditSaving] = useState(false);

  // Add user modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    email: '', full_name: '', phone: '', role: 'member',
    address_line1: '', address_line2: '', city: '', postal_code: '', birthday: '',
    center_id: '',
  });
  const [addInstructorCenterIds, setAddInstructorCenterIds] = useState<string[]>([]);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState('');

  // History modal
  const [historyUser, setHistoryUser] = useState<User | null>(null);
  const [userBookings, setUserBookings] = useState<UserBooking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchCenters();
    fetchMembershipTypes();
  }, [selectedCenter]);

  async function fetchUsers() {
    let query = supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (selectedCenter) {
      query = query.eq('center_id', selectedCenter);
    }

    const { data } = await query;
    setUsers((data ?? []) as User[]);
    setLoading(false);
  }

  async function fetchCenters() {
    const { data } = await supabase
      .from('centers')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    setCenters((data ?? []) as Center[]);
  }

  async function fetchMembershipTypes() {
    const { data } = await supabase
      .from('membership_types')
      .select('id, name')
      .eq('is_active', true)
      .order('sort_order')
      .order('name');
    setMembershipTypes((data ?? []) as MembershipType[]);
  }

  // --- Edit ---
  async function openEditModal(user: User) {
    setEditUser(user);
    setEditForm({
      full_name: user.full_name || '',
      phone: user.phone || '',
      role: user.role || 'member',
      address_line1: user.address_line1 || '',
      address_line2: user.address_line2 || '',
      city: user.city || '',
      postal_code: user.postal_code || '',
      birthday: user.birthday || '',
      center_id: user.center_id || '',
      membership_type_id: user.membership_type_id || '',
    });

    // If instructor, fetch their center assignments
    if (user.role === 'instructor') {
      const { data } = await supabase
        .from('instructor_centers')
        .select('center_id')
        .eq('instructor_id', user.id);
      setEditInstructorCenterIds((data ?? []).map((r: InstructorCenter) => r.center_id));
    } else {
      setEditInstructorCenterIds([]);
    }
  }

  async function saveEdit() {
    if (!editUser) return;
    setEditSaving(true);

    // Update profile via admin RPC (bypasses RLS)
    const { error } = await supabase.rpc('admin_update_profile', {
      target_user_id: editUser.id,
      new_full_name: editForm.full_name || null,
      new_phone: editForm.phone || null,
      new_role: editForm.role,
      new_address_line1: editForm.address_line1 || null,
      new_address_line2: editForm.address_line2 || null,
      new_city: editForm.city || null,
      new_postal_code: editForm.postal_code || null,
      new_birthday: editForm.birthday || null,
      new_center_id: editForm.role !== 'instructor' ? (editForm.center_id || null) : null,
    });
    if (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to save: ' + error.message);
      setEditSaving(false);
      return;
    }

    // Update membership type (separate update since admin_update_profile doesn't include it)
    await supabase
      .from('profiles')
      .update({ membership_type_id: editForm.membership_type_id || null })
      .eq('id', editUser.id);

    // If instructor, sync instructor_centers
    if (editForm.role === 'instructor') {
      // Remove all existing
      await supabase
        .from('instructor_centers')
        .delete()
        .eq('instructor_id', editUser.id);

      // Insert new ones
      if (editInstructorCenterIds.length > 0) {
        const rows = editInstructorCenterIds.map((cId) => ({
          instructor_id: editUser.id,
          center_id: cId,
        }));
        await supabase.from('instructor_centers').insert(rows);
      }
    }

    setEditSaving(false);
    setEditUser(null);
    fetchUsers();
  }

  // --- Add (Invite) ---
  async function saveAdd() {
    if (!addForm.email) return;
    setAddSaving(true);
    setAddError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setAddError('You must be logged in to invite users');
        setAddSaving(false);
        return;
      }

      const res = await supabase.functions.invoke('admin-invite-user', {
        body: {
          email: addForm.email.trim(),
          full_name: addForm.full_name || null,
          phone: addForm.phone || null,
          role: addForm.role,
          birthday: addForm.birthday || null,
          address_line1: addForm.address_line1 || null,
          address_line2: addForm.address_line2 || null,
          city: addForm.city || null,
          postal_code: addForm.postal_code || null,
          center_id: addForm.role !== 'instructor' ? (addForm.center_id || null) : null,
          center_ids: addForm.role === 'instructor' ? addInstructorCenterIds : undefined,
        },
      });

      if (res.error) {
        setAddError(res.error.message || 'Failed to invite user');
        setAddSaving(false);
        return;
      }

      const result = res.data as { error?: string; success?: boolean };
      if (result?.error) {
        setAddError(result.error);
        setAddSaving(false);
        return;
      }

      setAddSaving(false);
      setShowAddModal(false);
      setAddForm({ email: '', full_name: '', phone: '', role: 'member', address_line1: '', address_line2: '', city: '', postal_code: '', birthday: '', center_id: '' });
      setAddInstructorCenterIds([]);
      fetchUsers();
    } catch (err) {
      setAddError((err as Error).message);
      setAddSaving(false);
    }
  }

  // --- History ---
  async function openHistory(user: User) {
    setHistoryUser(user);
    setLoadingBookings(true);
    const { data } = await supabase
      .from('bookings')
      .select('*, class_instances(start_time, class_definitions(name))')
      .eq('user_id', user.id)
      .order('booked_at', { ascending: false })
      .limit(30);
    setUserBookings((data ?? []) as UserBooking[]);
    setLoadingBookings(false);
  }

  // --- Center helpers ---
  function toggleCenterId(list: string[], setList: (v: string[]) => void, id: string) {
    if (list.includes(id)) {
      setList(list.filter((c) => c !== id));
    } else {
      setList([...list, id]);
    }
  }

  function CenterSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
      <div>
        <label className="block text-sm font-medium text-mani-brown mb-1">Center</label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-sand rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none bg-sand-light"
        >
          <option value="">No center</option>
          {centers.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
    );
  }

  function CenterMultiSelect({ selected, onToggle }: { selected: string[]; onToggle: (id: string) => void }) {
    return (
      <div>
        <label className="block text-sm font-medium text-mani-brown mb-1">Centers (multiple)</label>
        <div className="flex flex-wrap gap-2">
          {centers.map((c) => {
            const isSelected = selected.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onToggle(c.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${
                  isSelected
                    ? 'bg-accent text-brand border-accent'
                    : 'bg-sand-light text-mani-brown border-sand hover:border-accent'
                }`}
              >
                {c.name}
              </button>
            );
          })}
          {centers.length === 0 && (
            <p className="text-xs text-mani-taupe">No centers available</p>
          )}
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.full_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const getCenterName = (centerId: string | null) => {
    if (!centerId) return '-';
    return centers.find((c) => c.id === centerId)?.name || '-';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-sand-light p-8">
        <p className="text-mani-taupe">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand-light p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-brand">Users ({users.length})</h1>
        <button
          onClick={() => { setShowAddModal(true); setAddError(''); }}
          className="px-4 py-2 bg-accent text-brand text-sm font-medium rounded-lg hover:bg-accent-dark transition-colors"
        >
          + Invite User
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full max-w-md px-4 py-2 border border-sand rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none bg-sand-light"
        />
      </div>

      {/* User Table */}
      <div className="bg-mani-cream rounded-xl border border-sand overflow-hidden">
        <table className="w-full">
          <thead className="bg-sand-light border-b border-sand">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-mani-brown uppercase tracking-wide">Name</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-mani-brown uppercase tracking-wide">Email</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-mani-brown uppercase tracking-wide">Phone</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-mani-brown uppercase tracking-wide">Center</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-mani-brown uppercase tracking-wide">Age</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-mani-brown uppercase tracking-wide">Role</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-mani-brown uppercase tracking-wide">Joined</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-mani-brown uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand/60">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-mani-taupe text-sm">
                  No users found
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-sand-light/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-brand">{user.full_name || '-'}</td>
                  <td className="px-6 py-4 text-sm text-mani-brown">{user.email}</td>
                  <td className="px-6 py-4 text-sm text-mani-brown">{user.phone || '-'}</td>
                  <td className="px-6 py-4 text-sm text-mani-brown">{getCenterName(user.center_id)}</td>
                  <td className="px-6 py-4"><AgeBadge birthday={user.birthday} /></td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                      user.role === 'admin'
                        ? 'bg-purple-100 text-purple-700'
                        : user.role === 'instructor'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-sand text-mani-brown'
                    }`}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-mani-brown">
                    {new Date(user.created_at).toLocaleDateString('da-DK')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => openEditModal(user)}
                        className="text-sm text-accent hover:text-accent-dark font-medium transition-colors"
                      >
                        Edit
                      </button>
                      <span className="text-sand-dark">|</span>
                      <button
                        onClick={() => openHistory(user)}
                        className="text-sm text-brand hover:underline font-medium"
                      >
                        History
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ======= Edit User Modal ======= */}
      {editUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-mani-cream rounded-2xl w-full max-w-lg mx-4 p-6 max-h-[85vh] overflow-auto border border-sand">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-brand">Edit User</h2>
              <button onClick={() => setEditUser(null)} className="text-mani-taupe hover:text-brand text-xl leading-none">&times;</button>
            </div>

            <p className="text-sm text-mani-brown mb-4">{editUser.email}</p>

            <form onSubmit={(e) => { e.preventDefault(); saveEdit(); }} className="space-y-3">
              <Field label="Full Name" value={editForm.full_name} onChange={(v) => setEditForm({ ...editForm, full_name: v })} placeholder="Full name" />
              <Field label="Phone" value={editForm.phone} onChange={(v) => setEditForm({ ...editForm, phone: v })} type="tel" placeholder="+45 ..." />

              <div>
                <label className="block text-sm font-medium text-mani-brown mb-1">Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full px-3 py-2 border border-sand rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none bg-sand-light"
                >
                  <option value="member">Member</option>
                  <option value="instructor">Instructor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* Center assignment — single for members/admins, multi for instructors */}
              {editForm.role === 'instructor' ? (
                <CenterMultiSelect
                  selected={editInstructorCenterIds}
                  onToggle={(id) => toggleCenterId(editInstructorCenterIds, setEditInstructorCenterIds, id)}
                />
              ) : (
                <CenterSelect
                  value={editForm.center_id}
                  onChange={(v) => setEditForm({ ...editForm, center_id: v })}
                />
              )}

              {/* Membership Type */}
              <div>
                <label className="block text-sm font-medium text-mani-brown mb-1">Membership Type</label>
                <select
                  value={editForm.membership_type_id}
                  onChange={(e) => setEditForm({ ...editForm, membership_type_id: e.target.value })}
                  className="w-full px-3 py-2 border border-sand rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none bg-sand-light"
                >
                  <option value="">No membership type</option>
                  {membershipTypes.map((mt) => (
                    <option key={mt.id} value={mt.id}>{mt.name}</option>
                  ))}
                </select>
              </div>

              <Field label="Birthday" value={editForm.birthday} onChange={(v) => setEditForm({ ...editForm, birthday: v })} type="date" />

              <div className="border-t border-sand pt-3 mt-3">
                <p className="text-xs font-medium text-mani-brown uppercase tracking-wide mb-2">Address</p>
                <div className="space-y-3">
                  <Field label="Address Line 1" value={editForm.address_line1} onChange={(v) => setEditForm({ ...editForm, address_line1: v })} placeholder="Street address" />
                  <Field label="Address Line 2" value={editForm.address_line2} onChange={(v) => setEditForm({ ...editForm, address_line2: v })} placeholder="Apt, suite, etc." />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="City" value={editForm.city} onChange={(v) => setEditForm({ ...editForm, city: v })} placeholder="City" />
                    <Field label="Postal Code" value={editForm.postal_code} onChange={(v) => setEditForm({ ...editForm, postal_code: v })} placeholder="0000" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setEditUser(null)} className="px-4 py-2 text-sm text-mani-brown hover:text-brand transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={editSaving} className="px-5 py-2 bg-accent text-brand text-sm font-medium rounded-lg hover:bg-accent-dark disabled:opacity-50 transition-colors">
                  {editSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======= Invite User Modal ======= */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-mani-cream rounded-2xl w-full max-w-lg mx-4 p-6 max-h-[85vh] overflow-auto border border-sand">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-brand">Invite User</h2>
              <button onClick={() => setShowAddModal(false)} className="text-mani-taupe hover:text-brand text-xl leading-none">&times;</button>
            </div>

            <div className="mb-4 p-3 bg-sand-light rounded-lg border border-sand">
              <p className="text-xs text-mani-brown">
                An invitation email will be sent to the user. They will be able to set their password and log in after accepting.
              </p>
            </div>

            {addError && (
              <div className="mb-4 p-3 bg-sand rounded-lg border border-sand-dark/30">
                <p className="text-xs text-mani-tierRed">{addError}</p>
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); saveAdd(); }} className="space-y-3">
              <Field label="Email" value={addForm.email} onChange={(v) => setAddForm({ ...addForm, email: v })} type="email" required placeholder="user@example.com" />
              <Field label="Full Name" value={addForm.full_name} onChange={(v) => setAddForm({ ...addForm, full_name: v })} placeholder="Full name" />
              <Field label="Phone" value={addForm.phone} onChange={(v) => setAddForm({ ...addForm, phone: v })} type="tel" placeholder="+45 ..." />

              <div>
                <label className="block text-sm font-medium text-mani-brown mb-1">Role</label>
                <select
                  value={addForm.role}
                  onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                  className="w-full px-3 py-2 border border-sand rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none bg-sand-light"
                >
                  <option value="member">Member</option>
                  <option value="instructor">Instructor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* Center assignment — single for members/admins, multi for instructors */}
              {addForm.role === 'instructor' ? (
                <CenterMultiSelect
                  selected={addInstructorCenterIds}
                  onToggle={(id) => toggleCenterId(addInstructorCenterIds, setAddInstructorCenterIds, id)}
                />
              ) : (
                <CenterSelect
                  value={addForm.center_id}
                  onChange={(v) => setAddForm({ ...addForm, center_id: v })}
                />
              )}

              <Field label="Birthday" value={addForm.birthday} onChange={(v) => setAddForm({ ...addForm, birthday: v })} type="date" />

              <div className="border-t border-sand pt-3 mt-3">
                <p className="text-xs font-medium text-mani-brown uppercase tracking-wide mb-2">Address</p>
                <div className="space-y-3">
                  <Field label="Address Line 1" value={addForm.address_line1} onChange={(v) => setAddForm({ ...addForm, address_line1: v })} placeholder="Street address" />
                  <Field label="Address Line 2" value={addForm.address_line2} onChange={(v) => setAddForm({ ...addForm, address_line2: v })} placeholder="Apt, suite, etc." />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="City" value={addForm.city} onChange={(v) => setAddForm({ ...addForm, city: v })} placeholder="City" />
                    <Field label="Postal Code" value={addForm.postal_code} onChange={(v) => setAddForm({ ...addForm, postal_code: v })} placeholder="0000" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm text-mani-brown hover:text-brand transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={addSaving} className="px-5 py-2 bg-accent text-brand text-sm font-medium rounded-lg hover:bg-accent-dark disabled:opacity-50 transition-colors">
                  {addSaving ? 'Sending invite...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======= View History Modal ======= */}
      {historyUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-mani-cream rounded-2xl w-full max-w-2xl mx-4 p-6 max-h-[80vh] overflow-auto border border-sand">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-brand">
                  {historyUser.full_name || historyUser.email}
                </h2>
                <p className="text-sm text-mani-brown">{historyUser.email}</p>
              </div>
              <button onClick={() => setHistoryUser(null)} className="text-mani-taupe hover:text-brand text-xl leading-none">&times;</button>
            </div>

            <h3 className="font-medium text-sm text-mani-brown mb-3">Booking History</h3>

            {loadingBookings ? (
              <p className="text-mani-taupe text-sm">Loading bookings...</p>
            ) : userBookings.length === 0 ? (
              <p className="text-mani-taupe text-sm">No bookings found</p>
            ) : (
              <div className="space-y-2">
                {userBookings.map((b) => (
                  <div key={b.id} className="flex items-center justify-between py-2.5 border-b border-sand last:border-0">
                    <div>
                      <p className="text-sm font-medium text-brand">
                        {b.class_instances?.class_definitions?.name || 'Unknown Class'}
                      </p>
                      <p className="text-xs text-mani-taupe">
                        {b.class_instances
                          ? new Date(b.class_instances.start_time).toLocaleString('da-DK')
                          : '-'}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                      b.status === 'confirmed'
                        ? 'bg-green-100 text-green-700'
                        : b.status === 'no_show'
                          ? 'bg-sand text-mani-tierRed'
                          : b.status === 'cancelled'
                            ? 'bg-gray-100 text-gray-600'
                            : 'bg-sand text-mani-brown'
                    }`}>
                      {b.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button onClick={() => setHistoryUser(null)} className="px-4 py-2 text-sm text-mani-brown hover:text-brand transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
