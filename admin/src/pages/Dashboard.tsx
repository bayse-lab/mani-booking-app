import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCenterContext } from '../App';

interface TodayClass {
  id: string;
  start_time: string;
  end_time: string;
  capacity: number;
  spots_remaining: number;
  instructor_name: string | null;
  center_id: string | null;
  class_definitions: { name: string };
}

interface CSVBooking {
  status: string;
  checked_in_at: string | null;
  booked_at: string;
  profiles: { full_name: string | null; email: string } | null;
  class_instances: {
    start_time: string;
    end_time: string;
    instructor_name: string | null;
    center_id: string | null;
    class_definitions: { name: string } | null;
    centers: { name: string } | null;
  } | null;
}

export default function DashboardPage() {
  const { selectedCenter, centers } = useCenterContext();
  const [todayClasses, setTodayClasses] = useState<TodayClass[]>([]);
  const [stats, setStats] = useState({
    totalMembers: 0,
    todayBookings: 0,
    todayCapacity: 0,
  });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // CSV date range - default to current month
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  const [csvFrom, setCsvFrom] = useState(defaultFrom);
  const [csvTo, setCsvTo] = useState(defaultTo);

  useEffect(() => {
    fetchDashboard();
  }, [selectedCenter]);

  async function fetchDashboard() {
    setLoading(true);
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(now);
    dayEnd.setHours(23, 59, 59, 999);

    let classesQuery = supabase
      .from('class_instances')
      .select('*, class_definitions(name)')
      .gte('start_time', dayStart.toISOString())
      .lt('start_time', dayEnd.toISOString())
      .eq('status', 'scheduled')
      .order('start_time');

    if (selectedCenter) {
      classesQuery = classesQuery.eq('center_id', selectedCenter);
    }

    const [classesRes, membersRes] = await Promise.all([
      classesQuery,
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
    ]);

    const classes = (classesRes.data ?? []) as TodayClass[];
    setTodayClasses(classes);

    const totalBooked = classes.reduce(
      (sum, c) => sum + (c.capacity - c.spots_remaining),
      0
    );
    const totalCapacity = classes.reduce((sum, c) => sum + c.capacity, 0);

    setStats({
      totalMembers: membersRes.count ?? 0,
      todayBookings: totalBooked,
      todayCapacity: totalCapacity,
    });

    setLoading(false);
  }

  async function handleExportCSV() {
    setExporting(true);

    const fromDate = new Date(csvFrom);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(csvTo);
    toDate.setHours(23, 59, 59, 999);

    // Query per-booking data for detailed attendance export
    let query = supabase
      .from('bookings')
      .select(`
        status, checked_in_at, booked_at,
        profiles(full_name, email),
        class_instances!inner(
          start_time, end_time, instructor_name, center_id,
          class_definitions(name),
          centers(name)
        )
      `)
      .in('status', ['confirmed', 'completed', 'no_show', 'late_cancelled'])
      .gte('class_instances.start_time', fromDate.toISOString())
      .lte('class_instances.start_time', toDate.toISOString())
      .order('booked_at');

    if (selectedCenter) {
      query = query.eq('class_instances.center_id', selectedCenter);
    }

    const { data, error } = await query;

    if (error || !data) {
      setExporting(false);
      return;
    }

    const rows = data as unknown as CSVBooking[];

    const centerName = selectedCenter
      ? centers.find((c) => c.id === selectedCenter)?.name ?? 'Ukendt'
      : 'Alle centre';

    const csvHeader = 'Dato;Tid;Hold;Instruktør;Center;Medlem;Email;Status;Tjekket ind';
    const csvRows = rows
      .filter((row) => row.class_instances !== null)
      .map((row) => {
        const ci = row.class_instances!;
        const startDate = new Date(ci.start_time);
        const date = startDate.toLocaleDateString('da-DK');
        const time = `${formatTime(ci.start_time)}\u2013${formatTime(ci.end_time)}`;
        const className = ci.class_definitions?.name ?? '';
        const instructor = ci.instructor_name ?? '';
        const center = ci.centers?.name ?? '';
        const memberName = row.profiles?.full_name ?? '';
        const email = row.profiles?.email ?? '';
        const status = row.status === 'no_show' ? 'No-show'
          : row.status === 'late_cancelled' ? 'Sen afmelding'
          : row.checked_in_at ? 'Tjekket ind' : 'Bekræftet';
        const checkedIn = row.checked_in_at ? 'Ja' : 'Nej';

        return [date, time, className, instructor, center, memberName, email, status, checkedIn].join(';');
      });

    const csvContent = [csvHeader, ...csvRows].join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `oversigt-${csvFrom}-til-${csvTo}-${centerName.replace(/\s/g, '-')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExporting(false);
  }

  if (loading) {
    return (
      <div className="p-8 bg-sand-light min-h-screen">
        <p className="text-mani-taupe">Indlæser dashboard...</p>
      </div>
    );
  }

  const occupancyRate =
    stats.todayCapacity > 0
      ? Math.round((stats.todayBookings / stats.todayCapacity) * 100)
      : 0;

  return (
    <div className="p-8 bg-sand-light min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-brand">Dashboard</h1>
      </div>

      {/* CSV Export with Date Range */}
      <div className="bg-mani-cream rounded-xl border border-sand-dark/20 p-4 mb-6">
        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <label className="block text-xs font-medium text-mani-brown mb-1">Fra</label>
            <input
              type="date"
              value={csvFrom}
              onChange={(e) => setCsvFrom(e.target.value)}
              className="px-3 py-2 border border-sand rounded-lg text-sm focus:ring-2 focus:ring-accent outline-none bg-sand-light"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-mani-brown mb-1">Til</label>
            <input
              type="date"
              value={csvTo}
              onChange={(e) => setCsvTo(e.target.value)}
              className="px-3 py-2 border border-sand rounded-lg text-sm focus:ring-2 focus:ring-accent outline-none bg-sand-light"
            />
          </div>
          <button
            onClick={handleExportCSV}
            disabled={exporting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-brand bg-accent transition-colors disabled:opacity-50 hover:bg-accent-dark"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {exporting ? 'Eksporterer...' : 'Eksportér CSV'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard label="Dagens hold" value={todayClasses.length} />
        <StatCard
          label="Dagens bookinger"
          value={`${stats.todayBookings} / ${stats.todayCapacity}`}
          subtitle={`${occupancyRate}% belægning`}
        />
        <StatCard label="Medlemmer i alt" value={stats.totalMembers} />
      </div>

      {/* Today's Schedule */}
      <h2 className="text-lg font-semibold mb-4 text-brand">Dagens program</h2>
      {todayClasses.length === 0 ? (
        <p className="text-mani-taupe">Ingen hold i dag</p>
      ) : (
        <div className="bg-mani-cream rounded-xl border border-sand-dark/20 overflow-hidden">
          <table className="w-full">
            <thead className="bg-sand/30 border-b border-sand-dark/20">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-mani-brown uppercase tracking-wide">
                  Tid
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-mani-brown uppercase tracking-wide">
                  Hold
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-mani-brown uppercase tracking-wide">
                  Instrukt&oslash;r
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-mani-brown uppercase tracking-wide">
                  Bookinger
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-mani-brown uppercase tracking-wide">
                  Handlinger
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand/40">
              {todayClasses.map((cls) => {
                const booked = cls.capacity - cls.spots_remaining;
                const pct = cls.capacity > 0 ? Math.round((booked / cls.capacity) * 100) : 0;
                return (
                  <tr key={cls.id} className="hover:bg-sand/10 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-brand">
                      {formatTime(cls.start_time)} &ndash;{' '}
                      {formatTime(cls.end_time)}
                    </td>
                    <td className="px-6 py-4 text-sm text-brand">
                      {cls.class_definitions.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-mani-brown">
                      {cls.instructor_name || '\u2013'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-sand rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              pct >= 90
                                ? 'bg-accent'
                                : pct >= 60
                                  ? 'bg-sand-dark'
                                  : 'bg-mani-taupe'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-mani-brown">
                          {booked}/{cls.capacity}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        to={`/schedule/${cls.id}`}
                        className="text-sm font-medium hover:underline text-accent"
                      >
                        Vis / Check-in
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
}) {
  return (
    <div className="bg-mani-cream rounded-xl border border-sand-dark/20 p-6">
      <p className="text-sm text-mani-brown mb-1">{label}</p>
      <p className="text-3xl font-bold text-brand">{value}</p>
      {subtitle && <p className="text-xs text-mani-taupe mt-1">{subtitle}</p>}
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
