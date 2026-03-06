import { useRef, useEffect } from 'react';
import { ScrollView, TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { getDayLabel, isSameDay } from '@/utils/date-helpers';
import { Colors } from '@/constants/colors';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface DaySelectorProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  currentMonth: Date; // first day of the month to display
}

function getDaysForMonth(monthStart: Date): Date[] {
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: Date[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    date.setHours(0, 0, 0, 0);
    // Skip past dates (but always include today)
    if (date >= today) {
      days.push(date);
    }
  }

  return days;
}

export function DaySelector({ selectedDate, onSelectDate, currentMonth }: DaySelectorProps) {
  const days = getDaysForMonth(currentMonth);
  const scrollRef = useRef<ScrollView>(null);

  // Auto-scroll to selected day when month changes
  useEffect(() => {
    const idx = days.findIndex((d) => isSameDay(d, selectedDate));
    if (idx > 0 && scrollRef.current) {
      scrollRef.current.scrollTo({ x: idx * 80 - 16, animated: true });
    }
  }, [currentMonth]);

  if (days.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No upcoming days this month</Text>
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {days.map((day) => {
        const isSelected = isSameDay(day, selectedDate);
        const isToday = isSameDay(day, new Date());
        return (
          <TouchableOpacity
            key={day.toISOString()}
            style={[styles.dayItem, isSelected && styles.dayItemSelected]}
            onPress={() => onSelectDate(day)}
          >
            <Text
              style={[styles.dayLabel, isSelected && styles.dayLabelSelected]}
            >
              {getDayLabel(day)}
            </Text>
            <Text
              style={[styles.dayNumber, isSelected && styles.dayNumberSelected]}
            >
              {day.getDate()}
            </Text>
            <Text
              style={[styles.dayMonth, isSelected && styles.dayMonthSelected]}
            >
              {MONTHS_SHORT[day.getMonth()]}
            </Text>
            {isToday && !isSelected && <View style={styles.todayDot} />}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  emptyContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'Jost-Light',
    fontSize: 13,
    color: Colors.textTertiary,
  },
  dayItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    width: 72,
    height: 78,
  },
  dayItemSelected: {
    backgroundColor: Colors.primary,
  },
  dayLabel: {
    fontFamily: 'Jost',
    fontSize: 11,
    fontWeight: '400',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  dayLabelSelected: {
    color: Colors.textOnPrimary,
  },
  dayNumber: {
    fontFamily: 'Jost',
    fontSize: 18,
    fontWeight: '300',
    color: Colors.text,
  },
  dayNumberSelected: {
    color: Colors.textOnPrimary,
  },
  dayMonth: {
    fontFamily: 'Jost',
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  dayMonthSelected: {
    color: Colors.textOnPrimary,
    opacity: 0.7,
  },
  todayDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.accent,
  },
});
