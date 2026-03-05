import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { ClassInstanceWithDefinition } from '@/types/database';
import { getDayStart, getDayEnd } from '@/utils/date-helpers';

export interface ClassFilters {
  centerId?: string | null;
  instructorName?: string | null;
  category?: string | null;
}

export function useClasses(selectedDate: Date, filters?: ClassFilters) {
  const [classes, setClasses] = useState<ClassInstanceWithDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClasses = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from('class_instances')
      .select('*, class_definitions(*), centers(name)')
      .gte('start_time', getDayStart(selectedDate))
      .lt('start_time', getDayEnd(selectedDate))
      .eq('status', 'scheduled')
      .order('start_time', { ascending: true });

    if (filters?.centerId) {
      query = query.eq('center_id', filters.centerId);
    }
    if (filters?.instructorName) {
      query = query.eq('instructor_name', filters.instructorName);
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      setError(fetchError.message);
    } else {
      let result = (data as ClassInstanceWithDefinition[]) ?? [];

      // Client-side filter for category (lives on class_definitions)
      if (filters?.category) {
        result = result.filter(
          (c) => c.class_definitions.category === filters.category
        );
      }

      setClasses(result);
    }
    setLoading(false);
  }, [selectedDate, filters?.centerId, filters?.instructorName, filters?.category]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  return { classes, loading, error, refetch: fetchClasses };
}
