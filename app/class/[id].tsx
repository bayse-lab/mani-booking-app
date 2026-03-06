import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useClassDetail } from '@/hooks/use-class-detail';
import { BookButton } from '@/components/booking/book-button';
import { Colors } from '@/constants/colors';
import { formatDate, formatTimeRange } from '@/utils/date-helpers';
import { canBook } from '@/utils/booking-rules';

export default function ClassDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { classInstance, userBooking, userWaitlistEntry, loading, error, refetch } =
    useClassDetail(id);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error || !classInstance) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Could not load class</Text>
      </View>
    );
  }

  const def = classInstance.class_definitions;
  const bookable = canBook(classInstance.start_time);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          {def.category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{def.category}</Text>
            </View>
          )}
          <Text style={styles.className}>{def.name}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.metaText}>{formatDate(classInstance.start_time)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.metaText}>
                {formatTimeRange(classInstance.start_time, classInstance.end_time)}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            {classInstance.instructor_name && (
              <View style={styles.metaItem}>
                <Ionicons name="person-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.metaText}>{classInstance.instructor_name}</Text>
              </View>
            )}
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.metaText}>
                {classInstance.spots_remaining}/{classInstance.capacity} spots
              </Text>
            </View>
          </View>

          {classInstance.centers?.name && (
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.metaText}>{classInstance.centers.name}</Text>
              </View>
            </View>
          )}

          {/* Intensity */}
          <View style={styles.intensityRow}>
            <Text style={styles.intensityLabel}>Intensity</Text>
            <View style={styles.intensityDots}>
              {[1, 2, 3, 4, 5].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.intensityDot,
                    {
                      backgroundColor:
                        i <= def.intensity
                          ? Colors.intensity[def.intensity] || Colors.textTertiary
                          : Colors.borderLight,
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        </View>

        {/* Description sections */}
        {def.description && (
          <InfoSection icon="information-circle-outline" title="About" text={def.description} />
        )}
        {def.what && (
          <InfoSection icon="barbell-outline" title="What?" text={def.what} />
        )}
        {def.who && (
          <InfoSection icon="people-outline" title="Who?" text={def.who} />
        )}
        {def.experience && (
          <InfoSection icon="school-outline" title="Experience?" text={def.experience} />
        )}
        {def.bring && (
          <InfoSection icon="bag-outline" title="Bring?" text={def.bring} />
        )}
        {def.wear && (
          <InfoSection icon="shirt-outline" title="Wear?" text={def.wear} />
        )}

        {/* Cancelled banner */}
        {classInstance.status === 'cancelled' && (
          <View style={styles.cancelledInfo}>
            <Ionicons name="close-circle" size={20} color={Colors.error} />
            <Text style={styles.cancelledText}>This class has been cancelled</Text>
          </View>
        )}

        {/* Waitlist info */}
        {userWaitlistEntry && (
          <View style={styles.waitlistInfo}>
            <Ionicons name="hourglass-outline" size={20} color={Colors.accent} />
            <Text style={styles.waitlistText}>
              You are on the waitlist at position #{userWaitlistEntry.position}
            </Text>
          </View>
        )}

        {/* Booking confirmed info */}
        {userBooking && (
          <View style={styles.confirmedInfo}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            <Text style={styles.confirmedText}>You are booked for this class</Text>
          </View>
        )}
      </ScrollView>

      {/* Fixed bottom button */}
      <View style={styles.buttonContainer}>
        <BookButton
          classInstance={classInstance}
          userBooking={userBooking}
          userWaitlistEntry={userWaitlistEntry}
          onAction={refetch}
        />
      </View>
    </View>
  );
}

function InfoSection({
  icon,
  title,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={18} color={Colors.primary} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <Text style={styles.sectionText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
    fontFamily: 'Jost',
  },
  header: {
    backgroundColor: Colors.surface,
    padding: 20,
    marginBottom: 12,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.borderLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: 'Jost',
  },
  className: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 12,
    fontFamily: 'CormorantGaramond',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: 'Jost-Light',
  },
  intensityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  intensityLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
    fontFamily: 'Jost-Light',
  },
  intensityDots: {
    flexDirection: 'row',
    gap: 4,
  },
  intensityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  section: {
    backgroundColor: Colors.surface,
    padding: 20,
    marginBottom: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    fontFamily: 'CormorantGaramond',
  },
  sectionText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
    fontFamily: 'Jost-Light',
  },
  waitlistInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.warningLight,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
  },
  waitlistText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accentDark,
    flex: 1,
    fontFamily: 'Jost',
  },
  cancelledInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.errorLight,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
  },
  cancelledText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.error,
    flex: 1,
    fontFamily: 'Jost',
  },
  confirmedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.successLight,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
  },
  confirmedText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.success,
    flex: 1,
    fontFamily: 'Jost',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 34,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
});
