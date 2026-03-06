import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { formatDate, formatTimeRange } from '@/utils/date-helpers';
import { formatCountdown, formatCancelDeadline, canBook } from '@/utils/booking-rules';
import type { BookingWithClass } from '@/types/database';

interface BookingCardProps {
  booking: BookingWithClass;
  isUpcoming: boolean;
}

export function BookingCard({ booking, isUpcoming }: BookingCardProps) {
  const router = useRouter();
  const ci = booking.class_instances;
  const def = ci.class_definitions;

  const statusConfig = STATUS_CONFIG[booking.status] || STATUS_CONFIG.confirmed;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/class/${ci.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.topRow}>
        <View style={styles.dateInfo}>
          <Text style={styles.date}>{formatDate(ci.start_time)}</Text>
          <Text style={styles.time}>
            {formatTimeRange(ci.start_time, ci.end_time)}
          </Text>
        </View>
        <View
          style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}
        >
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>
      </View>

      <Text style={styles.className}>{def.name}</Text>

      {ci.instructor_name && (
        <Text style={styles.instructor}>
          <Ionicons name="person-outline" size={12} color={Colors.textSecondary} />{' '}
          {ci.instructor_name}
        </Text>
      )}

      {isUpcoming && booking.status === 'confirmed' && (
        <View style={styles.timerRow}>
          <View style={styles.timerItem}>
            <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.timerText}>
              Starts in {formatCountdown(ci.start_time)}
            </Text>
          </View>
          {canBook(ci.start_time) && (
            <View style={styles.timerItem}>
              <Ionicons name="alert-circle-outline" size={14} color={Colors.warning} />
              <Text style={[styles.timerText, { color: Colors.warning }]}>
                Free cancel: {formatCancelDeadline(ci.start_time)}
              </Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  confirmed: {
    label: 'Confirmed',
    color: Colors.success,
    bg: Colors.successLight,
  },
  cancelled: {
    label: 'Cancelled',
    color: Colors.textSecondary,
    bg: Colors.borderLight,
  },
  late_cancelled: {
    label: 'Late Cancel',
    color: Colors.warning,
    bg: Colors.warningLight,
  },
  no_show: {
    label: 'No Show',
    color: Colors.error,
    bg: Colors.errorLight,
  },
  completed: {
    label: 'Completed',
    color: Colors.textSecondary,
    bg: Colors.borderLight,
  },
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateInfo: {
    gap: 2,
  },
  date: {
    fontFamily: 'Jost',
    fontSize: 13,
    fontWeight: '300',
    color: Colors.textSecondary,
  },
  time: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  className: {
    fontFamily: 'CormorantGaramond',
    fontSize: 18,
    fontWeight: '400',
    color: Colors.text,
    marginBottom: 4,
  },
  instructor: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  timerRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  timerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timerText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
});
