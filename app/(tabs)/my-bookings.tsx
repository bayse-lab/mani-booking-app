import { View, Text, SectionList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useState } from 'react';
import { useBookings } from '@/hooks/use-bookings';
import { BookingCard } from '@/components/booking/booking-card';
import { Colors } from '@/constants/colors';
import type { BookingWithClass } from '@/types/database';

export default function MyBookingsScreen() {
  const { upcoming, past, loading, error, refetch } = useBookings();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const sections = [
    ...(upcoming.length > 0
      ? [{ title: 'Upcoming', data: upcoming, isUpcoming: true }]
      : []),
    ...(past.length > 0
      ? [{ title: 'Past Classes', data: past, isUpcoming: false }]
      : []),
  ];

  if (sections.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No bookings yet</Text>
        <Text style={styles.emptyDetail}>
          Head to the Schedule tab to book your first class
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item, section }) => (
          <BookingCard
            booking={item as BookingWithClass}
            isUpcoming={(section as any).isUpcoming}
          />
        )}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
          </View>
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  list: {
    paddingBottom: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 24,
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
    textAlign: 'center',
    fontFamily: 'Jost-Light',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    fontFamily: 'CormorantGaramond',
  },
});
