import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';
import { formatTimeRange } from '@/utils/date-helpers';
import { canBook } from '@/utils/booking-rules';
import type { ClassInstanceWithDefinition } from '@/types/database';

interface ClassCardProps {
  classInstance: ClassInstanceWithDefinition;
}

export function ClassCard({ classInstance }: ClassCardProps) {
  const router = useRouter();
  const def = classInstance.class_definitions;
  const spotsText = getSpotsText(classInstance);
  const spotsColor = getSpotsColor(classInstance);
  const bookable = canBook(classInstance.start_time);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/class/${classInstance.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.timeColumn}>
        <Text style={styles.startTime}>
          {formatTimeRange(classInstance.start_time, classInstance.end_time)}
        </Text>
        <Text style={styles.duration}>{def.duration_minutes} min</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.detailsColumn}>
        <Text style={styles.className} numberOfLines={1}>
          {def.name}
        </Text>

        <View style={styles.metaRow}>
          {classInstance.instructor_name && (
            <Text style={styles.instructor} numberOfLines={1}>
              {classInstance.instructor_name}
            </Text>
          )}
          {classInstance.centers?.name && (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.centerName} numberOfLines={1}>
                {classInstance.centers.name}
              </Text>
            </>
          )}
          <IntensityDots level={def.intensity} />
        </View>

        <View style={styles.bottomRow}>
          <Text style={[styles.spots, { color: spotsColor }]}>
            {bookable ? spotsText : 'Booking closed'}
          </Text>
          {def.category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{def.category}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function IntensityDots({ level }: { level: number }) {
  return (
    <View style={styles.intensityContainer}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View
          key={i}
          style={[
            styles.dot,
            {
              backgroundColor:
                i <= level
                  ? Colors.intensity[level] || Colors.textTertiary
                  : Colors.borderLight,
            },
          ]}
        />
      ))}
    </View>
  );
}

function getSpotsText(ci: ClassInstanceWithDefinition): string {
  if (ci.spots_remaining === 0) {
    return 'Fully booked';
  }
  if (ci.spots_remaining <= 3) {
    return `${ci.spots_remaining} spot${ci.spots_remaining === 1 ? '' : 's'} left`;
  }
  return `${ci.spots_remaining} spots`;
}

function getSpotsColor(ci: ClassInstanceWithDefinition): string {
  if (ci.spots_remaining === 0) return Colors.spots.full;
  if (ci.spots_remaining <= 3) return Colors.spots.limited;
  return Colors.spots.available;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 2,
    padding: 16,
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  timeColumn: {
    width: 100,
    justifyContent: 'center',
  },
  startTime: {
    fontFamily: 'Jost',
    fontSize: 13,
    fontWeight: '400',
    color: Colors.text,
  },
  duration: {
    fontFamily: 'Jost-Light',
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  divider: {
    width: 1,
    backgroundColor: Colors.borderLight,
    marginHorizontal: 12,
  },
  detailsColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  className: {
    fontFamily: 'CormorantGaramond',
    fontSize: 18,
    fontWeight: '400',
    color: Colors.text,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  instructor: {
    fontFamily: 'Jost-Light',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  metaDot: {
    fontSize: 13,
    color: Colors.textTertiary,
  },
  centerName: {
    fontSize: 13,
    color: Colors.textTertiary,
    flexShrink: 1,
  },
  intensityContainer: {
    flexDirection: 'row',
    gap: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  spots: {
    fontFamily: 'Jost',
    fontSize: 12,
    fontWeight: '400',
  },
  categoryBadge: {
    backgroundColor: Colors.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 2,
  },
  categoryText: {
    fontFamily: 'Jost',
    fontSize: 10,
    fontWeight: '400',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
