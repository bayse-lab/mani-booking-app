import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAdminAuth } from '../App';

// --- Types ---

interface ClassInstance {
  id: string;
  start_time: string;
  end_time: string;
  capacity: number;
  spots_remaining: number;
  status: string;
  instructor_name: string | null;
  center_id: string | null;
  class_definitions: { name: string };
  centers: { name: string } | null;
}

interface DateGroup {
  dateKey: string;
  label: string;
  classes: ClassInstance[];
}

// --- Helpers ---

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('da-DK', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatDateHeading(dateKey: string): string {
  const date = new Date(dateKey + 'T00:00:00');
  return date.toLocaleDateString('da-DK', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function getDateKey(iso: string): string {
  return new Date(iso).toLocaleDateString('sv-SE'); // YYYY-MM-DD
}

function isThisWeek(dateKey: string, today: Date): boolean {
  const d = new Date(dateKey + 'T00:00:00');
  const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay(); // Monday = 1
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - dayOfWeek + 1);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return d >= weekStart && d <= weekEnd;
}

function isNextWeek(dateKey: string, today: Date): boolean {
  const d = new Date(dateKey + 'T00:00:00');
  const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay();
  const nextWeekStart = new Date(today);
  nextWeekStart.setDate(today.getDate() - dayOfWeek + 8);
  nextWeekStart.setHours(0, 0, 0, 0);
  const nextWeekEnd = new Date(nextWeekStart);
  nextWeekEnd.setDate(nextWeekStart.getDate() + 6);
  nextWeekEnd.setHours(23, 59, 59, 999);
  return d >= nextWeekStart && d <= nextWeekEnd;
}

function groupByDate(classes: ClassInstance[]): DateGroup[] {
  const map = new Map<string, ClassInstance[]>();

  for (const cls of classes) {
    const key = getDateKey(cls.start_time);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)!.push(cls);
  }

  return Array.from(map.entries()).map(([dateKey, items]) => ({
    dateKey,
    label: formatDateHeading(dateKey),
    classes: items,
  }));
}

// --- Stat Card ---

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-mani-cream rounded-xl border border-sand-dark/20 p-6">
      <p className="text-sm text-mani-brown mb-1">{label}</p>
      <p className="text-3xl font-bold text-brand">{value}</p>
    </div>
  );
}

// --- Main Component ---

export default function InstructorSchedulePage() {
  const { session } = useAdminAuth();

  const [instructorName, setInstructorName] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClassInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch profile name, then classes
  useEffect(() => {
    if (!session) return;

    async function load() {
      setLoading(true);
      setError(null);

      // 1. Get the instructor's full_name from their profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', session!.user.id)
        .single();

      if (profileError || !profile?.full_name) {
        setError('Kunne ikke hente din profil. Kontakt en administrator.');
        setLoading(false);
        return;
      }

      const fullName = profile.full_name;
      setInstructorName(fullName);

      // 2. Build date range: today through 2 weeks out
      const now = new Date();
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);

      const twoWeeksLater = new Date(today);
      twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);
      twoWeeksLater.setHours(23, 59, 59, 999);

      // 3. Fetch class instances for this instructor
      const { data: instanceData, error: instanceError } = await supabase
        .from('class_instances')
        .select('*, class_definitions(name), centers(name)')
        .eq('instructor_name', fullName)
        .gte('start_time', today.toISOString())
        .lte('start_time', twoWeeksLater.toISOString())
        .eq('status', 'scheduled')
        .order('start_time');

      if (instanceError) {
        setError('Kunne ikke hente holdoversigt.');
        setLoading(false);
        return;
      }

      setClasses((instanceData ?? []) as ClassInstance[]);
      setLoading(false);
    }

    load();
  }, [session]);

  // --- Derived data ---

  const today = new Date();
  const dateGroups = groupByDate(classes);

  const classesThisWeek = classes.filter((c) =>
    isThisWeek(getDateKey(c.start_time), today)
  ).length;

  const classesNextWeek = classes.filter((c) =>
    isNextWeek(getDateKey(c.start_time), today)
  ).length;

  const totalBookings = classes.reduce(
    (sum, c) => sum + (c.capacity - c.spots_remaining),
    0
  );

  // --- Render ---

  if (loading) {
    return (
      <div className="p-8 bg-sand-light min-h-screen">
        <p className="text-mani-taupe">Indlaeser dit skema...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-sand-light min-h-screen">
        <p className="text-mani-tierRed">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-8 bg-sand-light min-h-screen">
      {/* Page heading */}
      <h1 className="text-2xl font-bold text-brand mb-6">Mine Hold</h1>

      {instructorName && (
        <p className="text-sm text-mani-brown mb-6">
          Velkommen, {instructorName}
        </p>
      )}

      {/* Stat summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard label="Hold denne uge" value={classesThisWeek} />
        <StatCard label="Hold naeste uge" value={classesNextWeek} />
        <StatCard label="Bookinger i alt" value={totalBookings} />
      </div>

      {/* Grouped class list */}
      {dateGroups.length === 0 ? (
        <div className="bg-mani-cream rounded-xl border border-sand p-8 text-center">
          <p className="text-mani-taupe">
            Ingen kommende hold de naeste 2 uger.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {dateGroups.map((group) => (
            <div key={group.dateKey}>
              {/* Date group header */}
              <h2 className="text-sm font-semibold text-mani-brown uppercase tracking-wide mb-3">
                {group.label}
              </h2>

              {/* Class cards for this date */}
              {group.classes.map((cls) => {
                const booked = cls.capacity - cls.spots_remaining;

                return (
                  <div
                    key={cls.id}
                    className="bg-mani-cream rounded-xl border border-sand p-4 mb-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        {/* Time + class name */}
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-brand">
                            {formatTime(cls.start_time)} &ndash;{' '}
                            {formatTime(cls.end_time)}
                          </span>
                          <span className="text-sm font-semibold text-brand">
                            {cls.class_definitions.name}
                          </span>
                        </div>

                        {/* Center + bookings */}
                        <div className="flex items-center gap-2">
                          {cls.centers && (
                            <span className="text-xs text-mani-brown">
                              {cls.centers.name}
                            </span>
                          )}
                          <span className="text-xs text-mani-brown">
                            &middot; {booked}/{cls.capacity} booket
                          </span>
                        </div>
                      </div>

                      {/* Detail link */}
                      <Link
                        to={`/schedule/${cls.id}`}
                        state={{ from: '/my-schedule' }}
                        className="text-sm font-medium hover:underline text-accent"
                      >
                        Vis detaljer
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
