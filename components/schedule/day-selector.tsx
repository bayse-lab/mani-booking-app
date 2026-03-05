import { ScrollView, TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { getNextDays, getDayLabel, isSameDay } from '@/utils/date-helpers';
import { Colors } from '@/constants/colors';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface DaySelectorProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

export function DaySelector({ selectedDate, onSelectDate }: DaySelectorProps) {
  const days = getNextDays(14);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {days.map((day) => {
        const isSelected = isSameDay(day, selectedDate);
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
  dayItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 2,
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
});
