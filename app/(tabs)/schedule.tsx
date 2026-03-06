import { useState, useMemo, useCallback } from 'react';
import { View, FlatList, Text, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
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

  // Derive filter options from loaded classes (unfiltered by instructor/category so options stay stable)
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

  return (
    <View style={styles.container}>
      <DaySelector selectedDate={selectedDate} onSelectDate={setSelectedDate} />

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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
