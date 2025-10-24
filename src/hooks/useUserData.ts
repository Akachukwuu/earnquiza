import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Database } from '../lib/supabase';

type UserData = Database['public']['Tables']['users']['Row'];

export function useUserData() {
  const { user } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async () => {
    if (!user) {
      setUserData(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user data:', error);
    } else {
      setUserData(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUserData();
  }, [user]);

  return { userData, loading, refetch: fetchUserData };
}
