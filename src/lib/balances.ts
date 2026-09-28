import type { ExpenseWithSplits, Participant } from './supabase';

export type Debt = {
  from: string;
  to: string;
  amount: number;
};

export type Balance = {
  memberId: string;
  name: string;
  net: number;
};

export function computeBalances(expenses: ExpenseWithSplits[], members: Participant[]): Balance[] {
  const totals = new Map<string, number>();

  for (const m of members) totals.set(m.id, 0);

  for (const e of expenses) {
    if (e.settled) continue;
    const splitCount = e.splits.length;
    if (splitCount === 0) continue;
    const share = e.amount / splitCount;
    totals.set(e.payer_id, (totals.get(e.payer_id) ?? 0) + e.amount);
    for (const s of e.splits) {
      totals.set(s.member_id, (totals.get(s.member_id) ?? 0) - share);
    }
  }

  return members
    .map((m) => ({ memberId: m.id, name: m.name, net: totals.get(m.id) ?? 0 }))
    .sort((a, b) => b.net - a.net);
}

export function computeDebts(expenses: ExpenseWithSplits[], members: Participant[]): Debt[] {
  const balances = computeBalances(expenses, members);
  const debtors = balances.filter((b) => b.net < -0.01).sort((a, b) => a.net - b.net);
  const creditors = balances.filter((b) => b.net > 0.01).sort((a, b) => b.net - a.net);

  const debts: Debt[] = [];
  let i = 0;
  let j = 0;
  const debtorBal = debtors.map((d) => Math.abs(d.net));
  const creditorBal = creditors.map((c) => c.net);

  while (i < debtors.length && j < creditors.length) {
    const settle = Math.min(debtorBal[i], creditorBal[j]);
    debts.push({
      from: debtors[i].memberId,
      to: creditors[j].memberId,
      amount: Math.round(settle * 100) / 100,
    });
    debtorBal[i] -= settle;
    creditorBal[j] -= settle;
    if (debtorBal[i] < 0.01) i++;
    if (creditorBal[j] < 0.01) j++;
  }

  return debts;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
