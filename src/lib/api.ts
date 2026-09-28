import { supabase, type Expense, type ExpenseWithSplits, type Participant, type Trip } from './supabase';

function asExpense(row: Expense): ExpenseWithSplits {
  return {
    ...row,
    amount: Number(row.amount),
    split_between: row.split_between ?? [],
    splits: (row.split_between ?? []).map((member_id) => ({ member_id })),
  };
}

export async function getTripById(id: string): Promise<Trip | null> {
  const { data, error } = await supabase.from('trips').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Trip | null;
}

export async function getTripByCode(code: string): Promise<Trip | null> {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('code', code.trim().toUpperCase())
    .maybeSingle();
  if (error) throw error;
  return data as Trip | null;
}

export async function createTrip(name: string, code: string): Promise<Trip> {
  const { data, error } = await supabase
    .from('trips')
    .insert({ name, code })
    .select()
    .single();
  if (error) throw error;
  return data as Trip;
}

export async function listParticipants(tripId: string): Promise<Participant[]> {
  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .eq('trip_id', tripId)
    .order('name');
  if (error) throw error;
  return (data ?? []) as Participant[];
}

export async function findParticipant(tripId: string, name: string): Promise<Participant | null> {
  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .eq('trip_id', tripId)
    .eq('name', name)
    .maybeSingle();
  if (error) throw error;
  return data as Participant | null;
}

export async function createParticipant(tripId: string, name: string): Promise<Participant> {
  const { data, error } = await supabase
    .from('participants')
    .insert({ trip_id: tripId, name })
    .select()
    .single();
  if (error) throw error;
  return data as Participant;
}

export async function listExpenses(tripId: string): Promise<ExpenseWithSplits[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('trip_id', tripId)
    .order('description');
  if (error) throw error;
  return ((data ?? []) as Expense[]).map(asExpense);
}

export async function createExpense(input: {
  tripId: string;
  description: string;
  amount: number;
  payerId: string;
  splitBetween: string[];
}): Promise<ExpenseWithSplits> {
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      trip_id: input.tripId,
      description: input.description,
      amount: input.amount,
      payer_id: input.payerId,
      split_between: input.splitBetween,
      settled: false,
    })
    .select()
    .single();
  if (error) throw error;
  return asExpense(data as Expense);
}

export async function updateExpense(
  id: string,
  patch: Partial<Pick<Expense, 'description' | 'amount' | 'payer_id' | 'split_between' | 'settled'>>
): Promise<void> {
  const { error } = await supabase.from('expenses').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw error;
}

export function subscribeToTrip(tripId: string, onChange: () => void) {
  const channel = supabase
    .channel(`trip-${tripId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `trip_id=eq.${tripId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `trip_id=eq.${tripId}` }, onChange)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
