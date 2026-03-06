import { useState, useMemo } from 'react';
import { View, FlatList, Text, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { MonthSelector } from '@/components/schedule/month-selector';
import { DaySelector } from '@/components/schedule/day-selector';
import { ClassCard } from '@/components/schedule/class-card';
import { FilterBar } from '@/components/schedule/filter-bar';
import { useClasses } from '@/hooks/use-classes';
import { useCenters } from '@/hooks/use-centers';
import { useAuth } from '@/lib/auth-provider';
import { Colors } from '@/constants/colors';

export default function ScheduleScreen() {
  const { profile } = useAuth();
  const { centers } = useCenters();

  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Default center filter to user's center
  const [selectedCenter, setSelectedCenter] = useState<string | null>(null);
  const [selectedInstructor, setSelectedInstructor] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [initialCenterSet, setInitialCenterSet] = useState(false);

  // Set default center from profile once
  if (profile?.center_id && !initialCenterSet) {
    setSelectedCenter(profile.center_id);
    setInitialCenterSet(true);
  }

  const filters = useMemo(
    () => ({
      centerId: selectedCenter,
      instructorName: selectedInstructor,
      category: selectedCategory,
    }),
    [selectedCenter, selectedInstructor, selectedCategory]
  );

  const { classes, loading, error, refetch } = useClasses(selectedDate, filters);

  // Derive filter options from loaded classes
  const { instructorOptions, categoryOptions } = useMemo(() => {
    const instructorSet = new Map<string, string>();
    const categorySet = new Map<string, string>();

    for (const c of classes) {
      if (c.instructor_name) {
        instructorSet.set(c.instructor_name, c.instructor_name);
      }
      if (c.class_definitions.category) {
        categorySet.set(c.class_definitions.category, c.class_definitions.category);
      }
    }

    return {
      instructorOptions: Array.from(instructorSet, ([value, label]) => ({ value, label })).sort(
        (a, b) => a.label.localeCompare(b.label)
      ),
      categoryOptions: Array.from(categorySet, ([value, label]) => ({ value, label })).sort(
        (a, b) => a.label.localeCompare(b.label)
      ),
    };
  }, [classes]);

  const centerOptions = useMemo(
    () => centers.map((c) => ({ value: c.id, label: c.name })),
    [centers]
  );

  function handleMonthChange(newMonth: Date) {
    setCurrentMonth(newMonth);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (
      newMonth.getMonth() === today.getMonth() &&
      newMonth.getFullYear() === today.getFullYear()
    ) {
      setSelectedDate(today);
    } else {
      const firstDay = new Date(newMonth.getFullYear(), newMonth.getMonth(), 1);
      firstDay.setHours(0, 0, 0, 0);
      setSelectedDate(firstDay);
    }
  }

  function handleDateSelect(date: Date) {
    setSelectedDate(date);
    if (
      date.getMonth() !== currentMonth.getMonth() ||
      date.getFullYear() !== currentMonth.getFullYear()
    ) {
      setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  }

  return (
    <View style={styles.container}>
      {/* Fixed header: month, days, filters — never scrolls */}
      <View style={styles.fixedHeader}>
        <MonthSelector currentMonth={currentMonth} onChangeMonth={handleMonthChange} />
        <DaySelector
          selectedDate={selectedDate}
          onSelectDate={handleDateSelect}
          currentMonth={currentMonth}
        />
        <FilterBar
          centers={centerOptions}
          instructors={instructorOptions}
          categories={categoryOptions}
          selectedCenter={selectedCenter}
          selectedInstructor={selectedInstructor}
          selectedCategory={selectedCategory}
          onCenterChange={setSelectedCenter}
          onInstructorChange={setSelectedInstructor}
          onCategoryChange={setSelectedCategory}
        />
      </View>

      {/* Scrollable content area */}
      <View style={styles.content}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>Failed to load classes</Text>
            <Text style={styles.errorDetail}>{error}</Text>
          </View>
        ) : classes.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No classes scheduled</Text>
            <Text style={styles.emptyDetail}>
              Check back later or try another day
            </Text>
          </View>
        ) : (
          <FlatList
            data={classes}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <ClassCard classInstance={item} />}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={refetch}
                tintColor={Colors.accent}
                colors={[Colors.accent]}
              />
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  fixedHeader: {
    backgroundColor: Colors.background,
    zIndex: 1,
  },
  content: {
    flex: 1,
  },
  list: {
    paddingTop: 8,
    paddingBottom: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.error,
    marginBottom: 4,
    fontFamily: 'Jost',
  },
  errorDetail: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontFamily: 'Jost-Light',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
    fontFamily: 'CormorantGaramond',
  },
  emptyDetail: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: 'Jost-Light',
  },
});
