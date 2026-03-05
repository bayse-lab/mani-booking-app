import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface CenterOption {
  id: string;
  name: string;
}

export function useCenters() {
  const [centers, setCenters] = useState<CenterOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('centers')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      setCenters((data as CenterOption[]) ?? []);
      setLoading(false);
    })();
  }, []);

  return { centers, loading };
}
