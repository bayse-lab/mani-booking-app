import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface ClassDef {
  id: string;
  name: string;
  description: string | null;
  what: string | null;
  who: string | null;
  experience: string | null;
  bring: string | null;
  wear: string | null;
  duration_minutes: number;
  capacity: number;
  intensity: number;
  category: string | null;
  is_active: boolean;
}

const EMPTY_FORM = {
  name: '',
  description: '',
  what: '',
  who: '',
  experience: '',
  bring: '',
  wear: '',
  duration_minutes: 50,
  capacity: 12,
  intensity: 3,
  category: 'reformer',
};

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  async function fetchClasses() {
    const { data } = await supabase
      .from('class_definitions')
      .select('*')
      .order('name');
    setClasses((data ?? []) as ClassDef[]);
    setLoading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    if (editingId) {
      await supabase
        .from('class_definitions')
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq('id', editingId);
    } else {
      await supabase.from('class_definitions').insert(form);
    }

    setSaving(false);
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    fetchClasses();
  }

  async function handleEdit(cls: ClassDef) {
    // Fetch full record to get all fields including rich text content
    const { data } = await supabase
      .from('class_definitions')
      .select('*')
      .eq('id', cls.id)
      .single();
    if (data) {
      setForm({
        name: data.name,
        description: data.description || '',
        what: data.what || '',
        who: data.who || '',
        experience: data.experience || '',
        bring: data.bring || '',
        wear: data.wear || '',
        duration_minutes: data.duration_minutes,
        capacity: data.capacity,
        intensity: data.intensity,
        category: data.category || 'reformer',
      });
      setEditingId(cls.id);
      setShowForm(true);
    }
  }

  async function handleToggleActive(cls: ClassDef) {
    await supabase
      .from('class_definitions')
      .update({ is_active: !cls.is_active })
      .eq('id', cls.id);
    fetchClasses();
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-mani-taupe text-sm">Loading classes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-sand-light min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-brand">Class Definitions</h1>
          <p className="text-sm text-mani-taupe mt-1">
            {classes.length} class{classes.length !== 1 ? 'es' : ''} configured
          </p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setForm(EMPTY_FORM);
            setShowForm(true);
          }}
          className="bg-accent text-brand px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-accent-dark transition-colors shadow-sm"
        >
          + New Class
        </button>
      </div>

      {/* Class List */}
      {classes.length === 0 ? (
        <div className="bg-mani-cream rounded-xl border border-sand p-12 text-center">
          <p className="text-mani-taupe text-sm">No classes defined yet.</p>
          <button
            onClick={() => {
              setEditingId(null);
              setForm(EMPTY_FORM);
              setShowForm(true);
            }}
            className="mt-4 text-accent text-sm font-medium hover:underline"
          >
            Create your first class
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {classes.map((cls) => (
            <div
              key={cls.id}
              className="bg-mani-cream rounded-xl border border-sand p-5 flex items-center justify-between hover:shadow-sm transition-shadow"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="font-semibold text-brand">{cls.name}</h3>
                  {cls.category && (
                    <span className="text-xs bg-sand/60 text-mani-brown px-2.5 py-0.5 rounded uppercase font-medium tracking-wide">
                      {cls.category}
                    </span>
                  )}
                  {cls.is_active ? (
                    <span className="text-xs bg-green-50 text-green-700 px-2.5 py-0.5 rounded font-medium">
                      Active
                    </span>
                  ) : (
                    <span className="text-xs bg-sand text-mani-tierRed px-2.5 py-0.5 rounded font-medium">
                      Inactive
                    </span>
                  )}
                </div>
                <p className="text-sm text-mani-taupe mt-1.5">
                  {cls.duration_minutes} min &middot; {cls.capacity} spots
                  &middot; Intensity {cls.intensity}/5
                </p>
              </div>
              <div className="flex gap-3 ml-4 flex-shrink-0">
                <button
                  onClick={() => handleEdit(cls)}
                  className="text-sm text-accent font-medium hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleToggleActive(cls)}
                  className={`text-sm font-medium hover:underline ${
                    cls.is_active ? 'text-mani-tierRed' : 'text-green-600'
                  }`}
                >
                  {cls.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-mani-cream rounded-2xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-auto border border-sand shadow-xl">
            <h2 className="text-lg font-semibold text-brand mb-1">
              {editingId ? 'Edit Class' : 'New Class Definition'}
            </h2>
            <p className="text-xs text-mani-taupe mb-5">
              {editingId
                ? 'Update the class details below.'
                : 'Fill in the details to create a new class.'}
            </p>

            <form onSubmit={handleSave} className="space-y-4">
              <Field
                label="Class Name"
                value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
                required
                placeholder="e.g., Power Reformer"
              />
              <Field
                label="Description"
                value={form.description}
                onChange={(v) => setForm({ ...form, description: v })}
                multiline
                placeholder="A brief overview of this class"
              />

              {/* Rich text content fields */}
              <div className="border-t border-sand pt-4 mt-4">
                <p className="text-xs uppercase tracking-wider text-mani-taupe font-medium mb-3">
                  Class Detail Content
                </p>
              </div>

              <Field
                label="What to Expect"
                value={form.what}
                onChange={(v) => setForm({ ...form, what: v })}
                multiline
                placeholder="Describe what participants will do in this class"
              />
              <Field
                label="Who Is It For"
                value={form.who}
                onChange={(v) => setForm({ ...form, who: v })}
                multiline
                placeholder="Who is this class designed for"
              />
              <Field
                label="Experience Level"
                value={form.experience}
                onChange={(v) => setForm({ ...form, experience: v })}
                multiline
                placeholder="Required experience or fitness level"
              />
              <Field
                label="What to Bring"
                value={form.bring}
                onChange={(v) => setForm({ ...form, bring: v })}
                multiline
                placeholder="Items participants should bring"
              />
              <Field
                label="What to Wear"
                value={form.wear}
                onChange={(v) => setForm({ ...form, wear: v })}
                multiline
                placeholder="Recommended attire for this class"
              />

              {/* Numeric / config fields */}
              <div className="border-t border-sand pt-4 mt-4">
                <p className="text-xs uppercase tracking-wider text-mani-taupe font-medium mb-3">
                  Configuration
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Field
                  label="Duration (min)"
                  value={String(form.duration_minutes)}
                  onChange={(v) =>
                    setForm({ ...form, duration_minutes: parseInt(v) || 50 })
                  }
                  type="number"
                />
                <Field
                  label="Capacity"
                  value={String(form.capacity)}
                  onChange={(v) =>
                    setForm({ ...form, capacity: parseInt(v) || 12 })
                  }
                  type="number"
                />
                <Field
                  label="Intensity (1-5)"
                  value={String(form.intensity)}
                  onChange={(v) =>
                    setForm({
                      ...form,
                      intensity: Math.min(5, Math.max(1, parseInt(v) || 3)),
                    })
                  }
                  type="number"
                />
              </div>
              <Field
                label="Category"
                value={form.category}
                onChange={(v) => setForm({ ...form, category: v })}
                placeholder="e.g., reformer, mat, barre"
              />

              <div className="flex gap-3 pt-4 border-t border-sand">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-accent text-brand py-2.5 rounded-lg font-medium text-sm hover:bg-accent-dark transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingId ? 'Update Class' : 'Create Class'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setForm(EMPTY_FORM);
                  }}
                  className="flex-1 bg-sand/40 text-mani-brown py-2.5 rounded-lg font-medium text-sm hover:bg-sand/60 transition-colors"
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

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  multiline = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  multiline?: boolean;
  placeholder?: string;
}) {
  const cn =
    'w-full px-3 py-2 border border-sand rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none bg-sand-light';

  return (
    <div>
      <label className="block text-sm font-medium text-mani-brown mb-1">
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn}
          rows={3}
          placeholder={placeholder}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn}
          required={required}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}
