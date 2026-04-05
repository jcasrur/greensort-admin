import React, { useEffect } from 'react';
import { supabase } from './supabase';

export default function PresenceTracker() {
  useEffect(() => {
    let channel;

    const startTracking = async () => {
      // 1. Kunin kung sino yung naka-login
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return; // Kung walang naka-login, wag mag-track

      // 2. Pumasok sa invisible room na 'app-presence'
      channel = supabase.channel('app-presence', {
        config: { presence: { key: user.id } }, // Gamitin ang ID niya
      });

      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // 3. I-broadcast sa buong system na ONLINE siya
          await channel.track({ user_id: user.id, status: 'Online' });
        }
      });
    };

    startTracking();

    // 4. Kapag ni-close ang tab o app, aalisin siya kusa ng system sa room!
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  return null; // Wala itong UI, tahimik lang tumatakbo sa background
}