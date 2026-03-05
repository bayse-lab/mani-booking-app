import { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/colors';
import { canBook } from '@/utils/booking-rules';
import { bookClass, cancelBooking, leaveWaitlist } from '@/services/booking-service';
import type { ClassInstanceWithDefinition, Booking, WaitlistEntry } from '@/types/database';

interface BookButtonProps {
  classInstance: ClassInstanceWithDefinition;
  userBooking: Booking | null;
  userWaitlistEntry: WaitlistEntry | null;
  onAction: () => void;
}

type ButtonState =
  | 'book'
  | 'join_waitlist'
  | 'cancel_booking'
  | 'leave_waitlist'
  | 'closed';

export function BookButton({
  classInstance,
  userBooking,
  userWaitlistEntry,
  onAction,
}: BookButtonProps) {
  const [loading, setLoading] = useState(false);

  const buttonState = getButtonState(
    classInstance,
    userBooking,
    userWaitlistEntry
  );

  const handlePress = async () => {
    if (loading) return;

    switch (buttonState) {
      case 'book':
      case 'join_waitlist':
        setLoading(true);
        const bookResult = await bookClass(classInstance.id);
        setLoading(false);
        if (!bookResult.success) {
          Alert.alert('Error', bookResult.error || 'Could not book class');
          return;
        }
        if (bookResult.action === 'booked') {
          Alert.alert('Booked!', 'You have been booked into this class.');
        } else if (bookResult.action === 'waitlisted') {
          Alert.alert(
            'Waitlisted',
            `You are on the waitlist at position #${bookResult.position}.`
          );
        }
        onAction();
        break;

      case 'cancel_booking':
        Alert.alert(
          'Cancel Booking',
          'Are you sure you want to cancel your booking?',
          [
            { text: 'No', style: 'cancel' },
            {
              text: 'Yes, Cancel',
              style: 'destructive',
              onPress: async () => {
                setLoading(true);
                const cancelResult = await cancelBooking(userBooking!.id);
                setLoading(false);
                if (!cancelResult.success) {
                  Alert.alert(
                    'Error',
                    cancelResult.error || 'Could not cancel booking'
                  );
                  return;
                }
                if (cancelResult.cancellation_type === 'late') {
                  Alert.alert(
                    'Late Cancellation',
                    'Your booking has been cancelled. A late cancellation fee may apply.'
                  );
                } else {
                  Alert.alert('Cancelled', 'Your booking has been cancelled.');
                }
                onAction();
              },
            },
          ]
        );
        break;

      case 'leave_waitlist':
        Alert.alert(
          'Leave Waitlist',
          'Are you sure you want to leave the waitlist?',
          [
            { text: 'No', style: 'cancel' },
            {
              text: 'Yes, Leave',
              style: 'destructive',
              onPress: async () => {
                setLoading(true);
                const leaveResult = await leaveWaitlist(classInstance.id);
                setLoading(false);
                if (!leaveResult.success) {
                  Alert.alert(
                    'Error',
                    leaveResult.error || 'Could not leave waitlist'
                  );
                  return;
                }
                Alert.alert('Done', 'You have left the waitlist.');
                onAction();
              },
            },
          ]
        );
        break;
    }
  };

  if (buttonState === 'closed') {
    const closedLabel =
      classInstance.status === 'cancelled'
        ? 'Class Cancelled'
        : classInstance.status === 'completed'
          ? 'Class Completed'
          : 'Booking Closed';
    return (
      <TouchableOpacity style={[styles.button, styles.buttonDisabled]} disabled>
        <Text style={styles.buttonTextDisabled}>{closedLabel}</Text>
      </TouchableOpacity>
    );
  }

  const config = BUTTON_CONFIG[buttonState];

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: config.bg }]}
      onPress={handlePress}
      disabled={loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={config.textColor} />
      ) : (
        <Text style={[styles.buttonText, { color: config.textColor }]}>
          {config.label}
          {buttonState === 'leave_waitlist' && userWaitlistEntry
            ? ` (Position #${userWaitlistEntry.position})`
            : ''}
        </Text>
      )}
    </TouchableOpacity>
  );
}

function getButtonState(
  ci: ClassInstanceWithDefinition,
  booking: Booking | null,
  waitlist: WaitlistEntry | null
): ButtonState {
  // Block booking if class is not in 'scheduled' status (e.g. cancelled/completed)
  if (ci.status !== 'scheduled') {
    return 'closed';
  }
  if (!canBook(ci.start_time)) {
    if (booking) return 'cancel_booking'; // Can still late-cancel
    return 'closed';
  }
  if (booking) return 'cancel_booking';
  if (waitlist) return 'leave_waitlist';
  if (ci.spots_remaining > 0) return 'book';
  return 'join_waitlist';
}

const BUTTON_CONFIG: Record<
  Exclude<ButtonState, 'closed'>,
  { label: string; bg: string; textColor: string }
> = {
  book: {
    label: 'Book Class',
    bg: Colors.primary,
    textColor: Colors.textOnPrimary,
  },
  join_waitlist: {
    label: 'Join Waitlist',
    bg: Colors.accent,
    textColor: Colors.textOnAccent,
  },
  cancel_booking: {
    label: 'Cancel Booking',
    bg: Colors.errorLight,
    textColor: Colors.error,
  },
  leave_waitlist: {
    label: 'Leave Waitlist',
    bg: Colors.warningLight,
    textColor: '#8B6914',
  },
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 2,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  buttonDisabled: {
    backgroundColor: Colors.borderLight,
  },
  buttonText: {
    fontFamily: 'Jost',
    fontSize: 15,
    fontWeight: '300',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  buttonTextDisabled: {
    fontFamily: 'Jost',
    fontSize: 15,
    fontWeight: '300',
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: Colors.textTertiary,
  },
});
