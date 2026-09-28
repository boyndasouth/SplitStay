import { useEffect, useState } from 'react';
import { createParticipant, createTrip, findParticipant, getTripByCode } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { generateCode } from '@/lib/balances';

type Props = {
  onJoined: (tripId: string, memberId: string) => void;
};

export default function LandingPage({ onJoined }: Props) {
  const { user, signOut } = useAuth();
  const defaultName = (user?.user_metadata?.full_name as string | undefined) ?? '';
  const [name, setName] = useState(defaultName);
  const [tripCode, setTripCode] = useState('');
  const [tripName, setTripName] = useState('');
  const [mode, setMode] = useState<'join' | 'create'>('join');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (defaultName && !name) setName(defaultName);
  }, [defaultName, name]);

  async function handleJoin() {
    if (!name.trim() || !tripCode.trim()) {
      setError('Please enter your name and a trip code.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const trip = await getTripByCode(tripCode);
      if (!trip) {
        setError('No trip found with that code. Check it and try again.');
        return;
      }

      const existing = await findParticipant(trip.id, name.trim());
      if (existing) {
        onJoined(trip.id, existing.id);
        return;
      }

      const member = await createParticipant(trip.id, name.trim());
      onJoined(trip.id, member.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!name.trim() || !tripName.trim()) {
      setError('Please enter your name and a trip name.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const trip = await createTrip(tripName.trim(), generateCode());
      const member = await createParticipant(trip.id, name.trim());
      onJoined(trip.id, member.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-sky-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-end mb-4">
          <button onClick={() => void signOut()} className="text-sm text-slate-500 hover:text-slate-800">
            Sign out
          </button>
        </div>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-600 rounded-2xl mb-4 shadow-lg shadow-teal-600/20">
            <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.793 2.101c.727.198 1.423-.342 1.423-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125H17.25M2.25 6a18.18 18.18 0 0 1 4.5-2.25m9 2.25v9m-9-9V3.75M15 6v9m-9-9a9 9 0 0 1 9 0m-9 0v9a9 9 0 0 0 9 0" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Tripsplit</h1>
          <p className="text-slate-500 mt-2">Track shared expenses and settle up easily.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-6">
          <div className="flex gap-2 mb-6 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => { setMode('join'); setError(null); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                mode === 'join' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Join Trip
            </button>
            <button
              onClick={() => { setMode('create'); setError(null); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                mode === 'create' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              New Trip
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Your name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all text-slate-900 placeholder:text-slate-400"
              />
            </div>

            {mode === 'join' ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Trip code</label>
                <input
                  value={tripCode}
                  onChange={(e) => setTripCode(e.target.value.toUpperCase())}
                  placeholder="e.g. AB3K9X"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all text-slate-900 placeholder:text-slate-400 uppercase tracking-widest font-mono"
                  maxLength={6}
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Trip name</label>
                <input
                  value={tripName}
                  onChange={(e) => setTripName(e.target.value)}
                  placeholder="e.g. Weekend in Lisbon"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all text-slate-900 placeholder:text-slate-400"
                />
              </div>
            )}

            {error && (
              <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3 border border-red-100">
                {error}
              </div>
            )}

            <button
              onClick={mode === 'join' ? handleJoin : handleCreate}
              disabled={loading}
              className="w-full py-3.5 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-teal-600/20"
            >
              {loading ? 'Connecting…' : mode === 'join' ? 'Join Trip' : 'Create Trip'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
