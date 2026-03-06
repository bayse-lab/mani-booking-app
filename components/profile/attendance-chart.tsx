import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-provider';
import { Colors } from '@/constants/colors';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];

interface MonthData {
  label: string;
  count: number;
}

export function AttendanceChart() {
  const { user } = useAuth();
  const [data, setData] = useState<MonthData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchAttendance();
  }, [user]);

  async function fetchAttendance() {
    if (!user) return;

    const now = new Date();
    const months: MonthData[] = [];

    // Get last 3 months + current month (4 months total)
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

      months.push({
        label: MONTH_LABELS[d.getMonth()],
        count: 0,
      });

      // Query bookings with status 'completed' or checked_in_at not null
      // within this month's class instances
      const { count } = await supabase
        .from('bookings')
        .select('id, class_instances!inner(start_time)', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('status', ['completed', 'confirmed'])
        .not('checked_in_at', 'is', null)
        .gte('class_instances.start_time', monthStart.toISOString())
        .lte('class_instances.start_time', monthEnd.toISOString());

      months[months.length - 1].count = count ?? 0;
    }

    setData(months);
    setLoading(false);
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Attendance</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={Colors.accent} />
        </View>
      </View>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const totalClasses = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Attendance</Text>
        <Text style={styles.totalLabel}>
          {totalClasses} {totalClasses === 1 ? 'class' : 'classes'}
        </Text>
      </View>

      <View style={styles.chartArea}>
        {data.map((month, idx) => {
          const barHeight = maxCount > 0 ? (month.count / maxCount) * 100 : 0;
          const isCurrentMonth = idx === data.length - 1;

          return (
            <View key={month.label} style={styles.barColumn}>
              {/* Count label above bar */}
              <Text style={styles.countLabel}>
                {month.count > 0 ? month.count : ''}
              </Text>

              {/* Bar container */}
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${Math.max(barHeight, month.count > 0 ? 8 : 0)}%`,
                      backgroundColor: isCurrentMonth ? Colors.accent : Colors.primary,
                      opacity: isCurrentMonth ? 1 : 0.7,
                    },
                  ]}
                />
              </View>

              {/* Month label */}
              <Text style={[styles.monthLabel, isCurrentMonth && styles.monthLabelCurrent]}>
                {month.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  title: {
    fontFamily: 'CormorantGaramond',
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
  },
  totalLabel: {
    fontFamily: 'Jost-Light',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  loadingContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 130,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  countLabel: {
    fontFamily: 'Jost',
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
    minHeight: 16,
  },
  barTrack: {
    flex: 1,
    width: 36,
    justifyContent: 'flex-end',
    borderRadius: 8,
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    borderRadius: 8,
    minHeight: 0,
  },
  monthLabel: {
    fontFamily: 'Jost',
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  monthLabelCurrent: {
    color: Colors.accent,
    fontWeight: '600',
  },
});
