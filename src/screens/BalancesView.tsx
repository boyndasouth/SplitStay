import { useState, useEffect, useCallback } from 'react';
import { listExpenses, listParticipants, subscribeToTrip, updateExpense } from '@/lib/api';
import type { ExpenseWithSplits, Participant } from '@/lib/supabase';
import { computeDebts, computeBalances, formatCurrency } from '@/lib/balances';

type Props = {
  tripId: string;
  tripCode: string;
  tripName: string;
  onNavigate: (tab: 'dashboard' | 'balances') => void;
  onLeave: () => void;
};

export default function BalancesView({ tripId, tripCode, tripName, onNavigate, onLeave }: Props) {
  const [members, setMembers] = useState<Participant[]>([]);
  const [expenses, setExpenses] = useState<ExpenseWithSplits[]>([]);
  const [settling, setSettling] = useState(false);

  const loadData = useCallback(async () => {
    const [people, rows] = await Promise.all([listParticipants(tripId), listExpenses(tripId)]);
    setMembers(people);
    setExpenses(rows);
  }, [tripId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    return subscribeToTrip(tripId, () => {
      void loadData();
    });
  }, [tripId, loadData]);

  const memberName = (id: string) => members.find((m) => m.id === id)?.name ?? 'Unknown';
  const balances = computeBalances(expenses, members);
  const debts = computeDebts(expenses, members);
  const openExpenses = expenses.filter((e) => !e.settled);
  const allSettled = debts.length === 0 && balances.every((b) => Math.abs(b.net) < 0.01);

  async function handleSettleAll() {
    setSettling(true);
    try {
      await Promise.all(openExpenses.map((e) => updateExpense(e.id, { settled: true })));
      await loadData();
    } finally {
      setSettling(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <div className="bg-gradient-to-r from-teal-600 to-sky-600 text-white">
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-8">
          <div className="flex items-center justify-between mb-6">
            <button onClick={onLeave} className="text-teal-100 hover:text-white text-sm font-medium transition-colors">
              ← Leave
            </button>
            <div className="flex items-center gap-2 bg-white/15 rounded-lg px-3 py-1.5 backdrop-blur-sm">
              <span className="text-xs text-teal-50">Code</span>
              <span className="font-mono font-bold tracking-widest">{tripCode}</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold">{tripName}</h1>
          <p className="text-teal-50 text-sm mt-1">Who owes whom</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4">
        <div className="flex gap-1 -mt-4 bg-white rounded-xl shadow-md border border-slate-100 p-1">
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-slate-500 hover:text-slate-700"
          >
            Expenses
          </button>
          <button
            onClick={() => onNavigate('balances')}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-teal-600 text-white"
          >
            Balances
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-6">
        {allSettled && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-500 rounded-full mb-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <p className="text-emerald-900 font-semibold text-lg">All settled up!</p>
            <p className="text-emerald-600 text-sm mt-1">Everyone's even. Time to plan the next trip.</p>
          </div>
        )}

        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Outstanding Debts
        </h2>
        {debts.length === 0 && !allSettled && (
          <p className="text-slate-400 text-center py-8">Nothing to settle right now.</p>
        )}
        <div className="space-y-3 mb-8">
          {debts.map((d, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex -space-x-2">
                    <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-semibold text-sm border-2 border-white">
                      {memberName(d.from).charAt(0).toUpperCase()}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-semibold text-sm border-2 border-white">
                      {memberName(d.to).charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-slate-500">Owes</p>
                    <p className="font-semibold text-slate-900 truncate">
                      {memberName(d.from)} → {memberName(d.to)}
                    </p>
                  </div>
                </div>
                <p className="text-lg font-bold text-slate-900">{formatCurrency(d.amount)}</p>
              </div>
            </div>
          ))}
        </div>

        {openExpenses.length > 0 && (
          <button
            onClick={() => void handleSettleAll()}
            disabled={settling}
            className="w-full mb-8 py-3 bg-white border border-teal-200 text-teal-700 font-semibold rounded-xl hover:bg-teal-50 disabled:opacity-50"
          >
            {settling ? 'Marking settled…' : 'Mark remaining expenses as settled'}
          </button>
        )}

        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Net Balances
        </h2>
        <div className="space-y-2 mb-8">
          {balances.map((b) => (
            <div key={b.memberId} className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex items-center justify-between">
              <span className="font-medium text-slate-800">{b.name}</span>
              <span className={`font-bold ${
                b.net > 0.01 ? 'text-emerald-600' : b.net < -0.01 ? 'text-orange-600' : 'text-slate-400'
              }`}>
                {b.net > 0.01 ? 'is owed ' : b.net < -0.01 ? 'owes ' : ''}
                {formatCurrency(Math.abs(b.net))}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
