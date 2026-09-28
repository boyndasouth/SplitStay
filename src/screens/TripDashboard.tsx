import { useState, useEffect, useCallback } from 'react';
import { createExpense, deleteExpense, listExpenses, listParticipants, subscribeToTrip, updateExpense } from '@/lib/api';
import type { ExpenseWithSplits, Participant } from '@/lib/supabase';
import { computeBalances, formatCurrency } from '@/lib/balances';

type Props = {
  tripId: string;
  tripCode: string;
  tripName: string;
  currentMemberId: string;
  onNavigate: (tab: 'dashboard' | 'balances') => void;
  onLeave: () => void;
};

export default function TripDashboard({
  tripId,
  tripCode,
  tripName,
  currentMemberId,
  onNavigate,
  onLeave,
}: Props) {
  const [members, setMembers] = useState<Participant[]>([]);
  const [expenses, setExpenses] = useState<ExpenseWithSplits[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [payerId, setPayerId] = useState(currentMemberId);
  const [splitMemberIds, setSplitMemberIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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

  useEffect(() => {
    if (members.length > 0 && splitMemberIds.length === 0) {
      setSplitMemberIds(members.map((m) => m.id));
    }
  }, [members, splitMemberIds.length]);

  const memberName = (id: string) => members.find((m) => m.id === id)?.name ?? 'Unknown';
  const balances = computeBalances(expenses, members);
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

  function toggleSplit(id: string) {
    setSplitMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleAddExpense() {
    const amt = parseFloat(amount);
    if (!description.trim()) { setFormError('Enter a description.'); return; }
    if (isNaN(amt) || amt <= 0) { setFormError('Enter a valid amount.'); return; }
    if (!payerId) { setFormError('Choose who paid.'); return; }
    if (splitMemberIds.length === 0) { setFormError('Select at least one person to split with.'); return; }

    setSubmitting(true);
    setFormError(null);
    try {
      await createExpense({
        tripId,
        description: description.trim(),
        amount: amt,
        payerId,
        splitBetween: splitMemberIds,
      });
      setDescription('');
      setAmount('');
      setShowForm(false);
      setSplitMemberIds(members.map((m) => m.id));
      await loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to add expense.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteExpense(id: string) {
    await deleteExpense(id);
    await loadData();
  }

  async function handleToggleSettled(expense: ExpenseWithSplits) {
    await updateExpense(expense.id, { settled: !expense.settled });
    await loadData();
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
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
          <div className="flex gap-6 mt-4">
            <div>
              <p className="text-teal-100 text-xs uppercase tracking-wide">Total spent</p>
              <p className="text-xl font-bold">{formatCurrency(totalSpent)}</p>
            </div>
            <div>
              <p className="text-teal-100 text-xs uppercase tracking-wide">People</p>
              <p className="text-xl font-bold">{members.length}</p>
            </div>
            <div>
              <p className="text-teal-100 text-xs uppercase tracking-wide">Expenses</p>
              <p className="text-xl font-bold">{expenses.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4">
        <div className="flex gap-1 -mt-4 bg-white rounded-xl shadow-md border border-slate-100 p-1">
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-teal-600 text-white"
          >
            Expenses
          </button>
          <button
            onClick={() => onNavigate('balances')}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-slate-500 hover:text-slate-700"
          >
            Balances
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-6">
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {balances.map((b) => (
            <div
              key={b.memberId}
              className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm border ${
                b.net > 0.01
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : b.net < -0.01
                  ? 'bg-orange-50 border-orange-200 text-orange-700'
                  : 'bg-slate-100 border-slate-200 text-slate-500'
              }`}
            >
              <span className="font-medium">{b.name}</span>
              <span className="ml-2 font-semibold">
                {b.net > 0.01 ? '+' : ''}{formatCurrency(b.net)}
              </span>
            </div>
          ))}
        </div>

        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="w-full py-3.5 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 active:scale-[0.99] transition-all shadow-lg shadow-teal-600/20 flex items-center justify-center gap-2"
          >
            <span className="text-xl leading-none">+</span> Add Expense
          </button>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">New Expense</h3>
              <button onClick={() => { setShowForm(false); setFormError(null); }} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">What was it?</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Dinner, gas, hotel"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount</label>
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    inputMode="decimal"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Paid by</label>
                  <select
                    value={payerId}
                    onChange={(e) => setPayerId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all bg-white"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Split between</label>
                <div className="flex flex-wrap gap-2">
                  {members.map((m) => {
                    const selected = splitMemberIds.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        onClick={() => toggleSplit(m.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          selected
                            ? 'bg-teal-600 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {m.name}
                      </button>
                    );
                  })}
                </div>
                {splitMemberIds.length > 0 && (
                  <p className="text-sm text-slate-500 mt-2">
                    Each person pays {formatCurrency(parseFloat(amount || '0') / splitMemberIds.length)}
                  </p>
                )}
              </div>
              {formError && (
                <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3 border border-red-100">{formError}</div>
              )}
              <button
                onClick={handleAddExpense}
                disabled={submitting}
                className="w-full py-3.5 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 active:scale-[0.99] transition-all disabled:opacity-50"
              >
                {submitting ? 'Adding…' : 'Save Expense'}
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 space-y-3">
          {expenses.length === 0 && !showForm && (
            <div className="text-center py-16 text-slate-400">
              <p className="text-lg font-medium">No expenses yet</p>
              <p className="text-sm mt-1">Add the first one to get started.</p>
            </div>
          )}
          {expenses.map((e) => {
            const perPerson = e.splits.length > 0 ? e.amount / e.splits.length : 0;
            return (
              <div key={e.id} className={`bg-white rounded-xl shadow-sm border p-4 group ${e.settled ? 'border-emerald-100 opacity-75' : 'border-slate-100'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{e.description}</p>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {memberName(e.payer_id)} paid · split {e.splits.length} ways
                      {e.settled ? ' · settled' : ''}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {e.splits.map((s) => (
                        <span key={s.member_id} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                          {memberName(s.member_id)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-lg font-bold text-slate-900">{formatCurrency(e.amount)}</p>
                    <p className="text-xs text-slate-400">{formatCurrency(perPerson)}/person</p>
                    <button
                      onClick={() => void handleToggleSettled(e)}
                      className="block w-full text-xs text-teal-600 hover:text-teal-800 mt-1"
                    >
                      {e.settled ? 'Reopen' : 'Mark settled'}
                    </button>
                    <button
                      onClick={() => void handleDeleteExpense(e.id)}
                      className="text-xs text-red-400 hover:text-red-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
