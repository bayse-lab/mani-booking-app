import { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAdminAuth } from '../App';

interface Attendee {
  id: string;
  user_id: string;
  status: string;
  checked_in_at: string | null;
  booked_at: string;
  profiles: {
    full_name: string | null;
    email: string;
    phone: string | null;
  };
}

interface WaitlistPerson {
  id: string;
  user_id: string;
  position: number;
  status: string;
  profiles: {
    full_name: string | null;
    email: string;
  };
}

interface ClassInfo {
  id: string;
  start_time: string;
  end_time: string;
  capacity: number;
  spots_remaining: number;
  status: string;
  instructor_name: string | null;
  class_definitions: { name: string };
  centers: { name: string } | null;
}

export default function ClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin, isInstructor, profile } = useAdminAuth();
  const location = useLocation();
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistPerson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  async function fetchData() {
    setLoading(true);

    const [classRes, bookingsRes, waitlistRes] = await Promise.all([
      supabase
        .from('class_instances')
        .select('*, class_definitions(name), centers(name)')
        .eq('id', id!)
        .single(),
      supabase
        .from('bookings')
        .select('*, profiles(full_name, email, phone)')
        .eq('class_instance_id', id!)
        .eq('status', 'confirmed')
        .order('booked_at'),
      supabase
        .from('waitlist_entries')
        .select('*, profiles(full_name, email)')
        .eq('class_instance_id', id!)
        .eq('status', 'waiting')
        .order('position'),
    ]);

    setClassInfo(classRes.data as ClassInfo);
    setAttendees((bookingsRes.data ?? []) as Attendee[]);
    setWaitlist((waitlistRes.data ?? []) as WaitlistPerson[]);
    setLoading(false);
  }

  async function handleCheckIn(bookingId: string, isCheckedIn: boolean) {
    const { data, error } = await supabase.rpc('fn_check_in_booking', {
      p_booking_id: bookingId,
      p_undo: isCheckedIn,
    });

    if (error) {
      console.error('Check-in failed:', error.message);
      alert('Check-in failed: ' + error.message);
      return;
    }

    const result = data as { success: boolean; error?: string };
    if (!result.success) {
      alert(result.error || 'Check-in failed');
      return;
    }

    fetchData();
  }

  async function handleNoShow(bookingId: string) {
    if (!confirm('Mark this person as a no-show?')) return;

    const { data, error } = await supabase.rpc('fn_mark_no_show', {
      p_booking_id: bookingId,
    });

    if (error) {
      console.error('No-show failed:', error.message);
      alert('No-show failed: ' + error.message);
      return;
    }

    const result = data as { success: boolean; error?: string };
    if (!result.success) {
      alert(result.error || 'Failed to mark no-show');
      return;
    }

    fetchData();
  }

  if (loading || !classInfo) {
    return (
      <div className="p-8">
        <p className="text-mani-taupe">Loading...</p>
      </div>
    );
  }

  const checkedInCount = attendees.filter((a) => a.checked_in_at).length;

  // Instructors can only check in for their own classes
  const canCheckIn =
    isAdmin ||
    (isInstructor &&
      classInfo.instructor_name != null &&
      profile?.full_name != null &&
      classInfo.instructor_name === profile.full_name);

  // Navigate back to whichever schedule the user came from
  const backTo = location.state?.from === '/my-schedule' ? '/my-schedule' : '/schedule';
  const backLabel = backTo === '/my-schedule' ? 'Mine Hold' : 'Schedule';

  return (
    <div className="p-8">
      <Link
        to={backTo}
        className="text-sm text-mani-taupe hover:text-accent mb-4 inline-block"
      >
        &larr; Back to {backLabel}
      </Link>

      {/* Class Header */}
      <div className="bg-mani-cream rounded-xl border border-sand p-6 mb-6">
        <h1 className="text-2xl font-serif font-semibold text-brand">
          {classInfo.class_definitions.name}
        </h1>
        <div className="flex flex-wrap gap-4 mt-2 text-sm text-mani-brown">
          <span>
            {formatTime(classInfo.start_time)} -{' '}
            {formatTime(classInfo.end_time)}
          </span>
          <span>{classInfo.instructor_name || 'No instructor'}</span>
          {classInfo.centers && (
            <span className="text-mani-taupe">{classInfo.centers.name}</span>
          )}
          <span>
            {classInfo.capacity - classInfo.spots_remaining}/
            {classInfo.capacity} booked
          </span>
          <span className="text-accent font-medium">{checkedInCount} checked in</span>
        </div>
      </div>

      {/* Attendees */}
      <h2 className="text-lg font-semibold text-brand mb-3">
        Attendees ({attendees.length})
      </h2>
      {attendees.length === 0 ? (
        <p className="text-mani-taupe mb-6">No bookings yet</p>
      ) : (
        <div className="bg-mani-cream rounded-xl border border-sand overflow-hidden mb-6">
          <table className="w-full">
            <thead className="bg-sand/30 border-b border-sand">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-mani-brown uppercase">
                  Name
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-mani-brown uppercase">
                  Email
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-mani-brown uppercase">
                  Phone
                </th>
                {canCheckIn && (
                  <th className="text-left px-6 py-3 text-xs font-medium text-mani-brown uppercase">
                    Check-in
                  </th>
                )}
                {canCheckIn && (
                  <th className="text-left px-6 py-3 text-xs font-medium text-mani-brown uppercase">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-sand/50">
              {attendees.map((att) => (
                <tr key={att.id} className="hover:bg-sand/10">
                  <td className="px-6 py-4 text-sm font-medium text-brand">
                    {att.profiles.full_name || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 text-sm text-mani-brown">
                    {att.profiles.email}
                  </td>
                  <td className="px-6 py-4 text-sm text-mani-brown">
                    {att.profiles.phone || '-'}
                  </td>
                  {canCheckIn && (
                    <td className="px-6 py-4">
                      <button
                        onClick={() =>
                          handleCheckIn(att.id, !!att.checked_in_at)
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          att.checked_in_at
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-sand/40 text-mani-brown hover:bg-sand'
                        }`}
                      >
                        {att.checked_in_at ? 'Checked In' : 'Check In'}
                      </button>
                    </td>
                  )}
                  {canCheckIn && (
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleNoShow(att.id)}
                        className="text-xs text-mani-tierRed hover:underline"
                      >
                        No-show
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Waitlist */}
      <h2 className="text-lg font-semibold text-brand mb-3">
        Waitlist ({waitlist.length})
      </h2>
      {waitlist.length === 0 ? (
        <p className="text-mani-taupe">No one on the waitlist</p>
      ) : (
        <div className="bg-mani-cream rounded-xl border border-sand overflow-hidden">
          <table className="w-full">
            <thead className="bg-sand/30 border-b border-sand">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-mani-brown uppercase">
                  Position
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-mani-brown uppercase">
                  Name
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-mani-brown uppercase">
                  Email
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand/50">
              {waitlist.map((w) => (
                <tr key={w.id}>
                  <td className="px-6 py-4 text-sm font-bold text-accent">
                    #{w.position}
                  </td>
                  <td className="px-6 py-4 text-sm text-brand">
                    {w.profiles.full_name || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 text-sm text-mani-brown">
                    {w.profiles.email}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
