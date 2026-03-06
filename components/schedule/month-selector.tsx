import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

const MONTHS = [
  'Januar', 'Februar', 'Marts', 'April', 'Maj', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'December',
];

interface MonthSelectorProps {
  currentMonth: Date; // first day of the displayed month
  onChangeMonth: (newMonth: Date) => void;
}

export function MonthSelector({ currentMonth, onChangeMonth }: MonthSelectorProps) {
  const month = currentMonth.getMonth();
  const year = currentMonth.getFullYear();

  const now = new Date();
  const isCurrentMonth =
    month === now.getMonth() && year === now.getFullYear();

  function goBack() {
    // Don't go before current month
    if (isCurrentMonth) return;
    const prev = new Date(year, month - 1, 1);
    onChangeMonth(prev);
  }

  function goForward() {
    const next = new Date(year, month + 1, 1);
    onChangeMonth(next);
  }

  function goToday() {
    const today = new Date();
    onChangeMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={goBack}
        style={[styles.arrow, isCurrentMonth && styles.arrowDisabled]}
        disabled={isCurrentMonth}
      >
        <Text style={[styles.arrowText, isCurrentMonth && styles.arrowTextDisabled]}>
          {'\u2039'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={goToday} style={styles.labelWrap}>
        <Text style={styles.label}>
          {MONTHS[month]} {year}
        </Text>
        {!isCurrentMonth && (
          <Text style={styles.todayHint}>Tap for today</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={goForward} style={styles.arrow}>
        <Text style={styles.arrowText}>{'\u203A'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  arrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowDisabled: {
    opacity: 0.3,
  },
  arrowText: {
    fontSize: 22,
    fontWeight: '300',
    color: Colors.text,
    marginTop: -2,
  },
  arrowTextDisabled: {
    color: Colors.textTertiary,
  },
  labelWrap: {
    alignItems: 'center',
  },
  label: {
    fontFamily: 'CormorantGaramond',
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    textTransform: 'capitalize',
  },
  todayHint: {
    fontFamily: 'Jost-Light',
    fontSize: 11,
    color: Colors.accent,
    marginTop: 1,
  },
});
