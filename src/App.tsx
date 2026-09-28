import { useState, useEffect } from 'react';
import LandingPage from '@/screens/LandingPage';
import TripDashboard from '@/screens/TripDashboard';
import BalancesView from '@/screens/BalancesView';
import AuthScreen from '@/screens/AuthScreen';
import { getTripById } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Trip } from '@/lib/supabase';

type Screen = 'landing' | 'dashboard' | 'balances';

type TripSession = {
  tripId: string;
  memberId: string;
};

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const [screen, setScreen] = useState<Screen>('landing');
  const [session, setSession] = useState<TripSession | null>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [tripLoading, setTripLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('tripsplit-session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as TripSession;
        setSession(parsed);
        setScreen('dashboard');
      } catch {
        localStorage.removeItem('tripsplit-session');
      }
    }
  }, []);

  useEffect(() => {
    if (!session) {
      setTrip(null);
      return;
    }
    setTripLoading(true);
    getTripById(session.tripId)
      .then((data) => {
        setTrip(data);
      })
      .finally(() => {
        setTripLoading(false);
      });
  }, [session]);

  function handleJoined(tripId: string, memberId: string) {
    const s = { tripId, memberId };
    setSession(s);
    localStorage.setItem('tripsplit-session', JSON.stringify(s));
    setScreen('dashboard');
  }

  function handleLeave() {
    localStorage.removeItem('tripsplit-session');
    setSession(null);
    setTrip(null);
    setScreen('landing');
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 animate-pulse">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (screen === 'landing' || !session) {
    return <LandingPage onJoined={handleJoined} />;
  }

  if (tripLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 animate-pulse">Loading trip…</div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <p className="text-slate-500">This trip no longer exists.</p>
        <button
          onClick={handleLeave}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
        >
          Back to start
        </button>
      </div>
    );
  }

  if (screen === 'balances') {
    return (
      <BalancesView
        tripId={trip.id}
        tripCode={trip.code}
        tripName={trip.name}
        onNavigate={(tab) => setScreen(tab)}
        onLeave={handleLeave}
      />
    );
  }

  return (
    <TripDashboard
      tripId={trip.id}
      tripCode={trip.code}
      tripName={trip.name}
      currentMemberId={session.memberId}
      onNavigate={(tab) => setScreen(tab)}
      onLeave={handleLeave}
    />
  );
}
