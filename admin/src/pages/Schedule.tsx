import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCenterContext } from '../App';

interface ClassInstance {
  id: string;
  start_time: string;
  end_time: string;
  capacity: number;
  spots_remaining: number;
  status: string;
  instructor_name: string | null;
  center_id: string | null;
  class_definitions: { id: string; name: string };
  centers: { id: string; name: string } | null;
}

interface ClassDef {
  id: string;
  name: string;
  duration_minutes: number;
  capacity: number;
}

export default function SchedulePage() {
  const { centers, selectedCenter } = useCenterContext();

  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [instances, setInstances] = useState<ClassInstance[]>([]);
  const [classDefs, setClassDefs] = useState<ClassDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    class_definition_id: '',
    instructor_name: '',
    date: '',
    time: '09:00',
    capacity: 12,
    repeat_weeks: 1,
    center_id: '',
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchInstances();
  }, [selectedDate, selectedCenter]);

  useEffect(() => {
    fetchClassDefs();
  }, []);

  async function fetchInstances() {
    setLoading(true);
    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(selectedDate);
    dayEnd.setHours(23, 59, 59, 999);

    let query = supabase
      .from('class_instances')
      .select('*, class_definitions(id, name), centers(id, name)')
      .gte('start_time', dayStart.toISOString())
      .lt('start_time', dayEnd.toISOString())
      .order('start_time');

    if (selectedCenter) {
      query = query.eq('center_id', selectedCenter);
    }

    const { data } = await query;

    setInstances((data ?? []) as ClassInstance[]);
    setLoading(false);
  }

  async function fetchClassDefs() {
    const { data } = await supabase
      .from('class_definitions')
      .select('id, name, duration_minutes, capacity')
      .eq('is_active', true)
      .order('name');
    setClassDefs((data ?? []) as ClassDef[]);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);

    const classDef = classDefs.find(
      (c) => c.id === form.class_definition_id
    );
    if (!classDef) return;

    const inserts = [];
    for (let w = 0; w < form.repeat_weeks; w++) {
      const date = new Date(form.date);
      date.setDate(date.getDate() + w * 7);
      const [hours, minutes] = form.time.split(':').map(Number);

      const startTime = new Date(date);
      startTime.setHours(hours, minutes, 0, 0);

      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + classDef.duration_minutes);

      inserts.push({
        class_definition_id: form.class_definition_id,
        instructor_name: form.instructor_name || null,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        capacity: form.capacity,
        spots_remaining: form.capacity,
        center_id: form.center_id || null,
      });
    }

    await supabase.from('class_instances').insert(inserts);
    setCreating(false);
    setShowForm(false);
    fetchInstances();
  }

  async function handleCancel(instanceId: string) {
    if (!confirm('Cancel this class? All booked users will be notified.'))
      return;

    await supabase
      .from('class_instances')
      .update({ status: 'cancelled' })
      .eq('id', instanceId);

    fetchInstances();
  }

  const displayDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString(
    'da-DK',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
  );

  return (
    <div className="p-8 bg-sand-light min-h-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-brand">Schedule</h1>
        <button
          onClick={() => {
            setForm({
              ...form,
              date: selectedDate,
              class_definition_id: classDefs[0]?.id || '',
              capacity: classDefs[0]?.capacity || 12,
              center_id: selectedCenter || '',
            });
            setShowForm(true);
          }}
          className="bg-accent text-brand px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-dark transition-colors"
        >
          + Add Class
        </button>
      </div>

      {/* Date Picker */}
      <div className="mb-6 flex items-center gap-4">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-4 py-2 border border-sand rounded-lg text-sm focus:ring-2 focus:ring-accent bg-sand-light outline-none"
        />
        <span className="text-sm text-mani-brown font-medium capitalize">
          {displayDate}
        </span>
      </div>

      {/* Class List */}
      {loading ? (
        <p className="text-mani-taupe">Loading...</p>
      ) : instances.length === 0 ? (
        <div className="bg-mani-cream rounded-xl border border-sand p-8 text-center">
          <p className="text-mani-taupe">No classes on this day</p>
        </div>
      ) : (
        <div className="space-y-3">
          {instances.map((inst) => {
            const booked = inst.capacity - inst.spots_remaining;
            const isCancelled = inst.status === 'cancelled';

            return (
              <div
                key={inst.id}
                className={`bg-mani-cream rounded-xl border p-4 flex items-center justify-between ${
                  isCancelled
                    ? 'border-accent/30 opacity-60'
                    : 'border-sand'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-brand">
                      {formatTime(inst.start_time)} -{' '}
                      {formatTime(inst.end_time)}
                    </span>
                    <span className="font-medium text-brand">
                      {inst.class_definitions.name}
                    </span>
                    {isCancelled && (
                      <span className="text-xs bg-sand text-mani-tierRed px-2 py-0.5 rounded">
                        Cancelled
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-mani-brown mt-1">
                    {inst.instructor_name || 'No instructor'}
                    {!selectedCenter && inst.centers && (
                      <span className="text-mani-taupe">
                        {' '}&middot; {inst.centers.name}
                      </span>
                    )}
                    {' '}&middot; {booked}/{inst.capacity} booked
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    to={`/schedule/${inst.id}`}
                    className="text-sm text-brand hover:underline font-medium"
                  >
                    Details
                  </Link>
                  {!isCancelled && (
                    <button
                      onClick={() => handleCancel(inst.id)}
                      className="text-sm text-mani-tierRed hover:underline"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-mani-cream rounded-2xl w-full max-w-md mx-4 p-6 border border-sand">
            <h2 className="text-lg font-semibold text-brand mb-4">
              Add Class to Schedule
            </h2>

            <form onSubmit={handleCreate} className="space-y-4">
              {/* Center */}
              <div>
                <label className="block text-sm font-medium text-mani-brown mb-1">
                  Center
                </label>
                <select
                  value={form.center_id}
                  onChange={(e) =>
                    setForm({ ...form, center_id: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-sand rounded-lg text-sm bg-sand-light focus:ring-2 focus:ring-accent outline-none"
                  required
                >
                  <option value="">Select center</option>
                  {centers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Class */}
              <div>
                <label className="block text-sm font-medium text-mani-brown mb-1">
                  Class
                </label>
                <select
                  value={form.class_definition_id}
                  onChange={(e) => {
                    const def = classDefs.find((c) => c.id === e.target.value);
                    setForm({
                      ...form,
                      class_definition_id: e.target.value,
                      capacity: def?.capacity || 12,
                    });
                  }}
                  className="w-full px-3 py-2 border border-sand rounded-lg text-sm bg-sand-light focus:ring-2 focus:ring-accent outline-none"
                  required
                >
                  <option value="">Select a class</option>
                  {classDefs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Instructor */}
              <div>
                <label className="block text-sm font-medium text-mani-brown mb-1">
                  Instructor
                </label>
                <input
                  type="text"
                  value={form.instructor_name}
                  onChange={(e) =>
                    setForm({ ...form, instructor_name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-sand rounded-lg text-sm bg-sand-light focus:ring-2 focus:ring-accent outline-none"
                  placeholder="Instructor name"
                />
              </div>

              {/* Date + Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-mani-brown mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3 py-2 border border-sand rounded-lg text-sm bg-sand-light focus:ring-2 focus:ring-accent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-mani-brown mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    className="w-full px-3 py-2 border border-sand rounded-lg text-sm bg-sand-light focus:ring-2 focus:ring-accent outline-none"
                    required
                  />
                </div>
              </div>

              {/* Capacity + Repeat */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-mani-brown mb-1">
                    Capacity
                  </label>
                  <input
                    type="number"
                    value={form.capacity}
                    onChange={(e) =>
                      setForm({ ...form, capacity: parseInt(e.target.value) || 12 })
                    }
                    className="w-full px-3 py-2 border border-sand rounded-lg text-sm bg-sand-light focus:ring-2 focus:ring-accent outline-none"
                    min={1}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-mani-brown mb-1">
                    Repeat (weeks)
                  </label>
                  <input
                    type="number"
                    value={form.repeat_weeks}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        repeat_weeks: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full px-3 py-2 border border-sand rounded-lg text-sm bg-sand-light focus:ring-2 focus:ring-accent outline-none"
                    min={1}
                    max={12}
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-accent text-brand py-2.5 rounded-lg font-medium text-sm disabled:opacity-50 hover:bg-accent-dark transition-colors"
                >
                  {creating
                    ? 'Creating...'
                    : form.repeat_weeks > 1
                      ? `Create ${form.repeat_weeks} classes`
                      : 'Create Class'}
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

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('da-DK', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
