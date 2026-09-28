/*
# Trip Expense Tracker Schema

## Overview
A group trip expense splitting tool where members join via a shareable code,
add expenses, and settle up debts. No authentication — trips are accessed by code.

## New Tables
1. `trips` — a group trip with a shareable join code
   - id (uuid PK)
   - name (text) — trip name
   - code (text, unique) — 6-char shareable join code
   - created_at (timestamptz)

2. `members` — people in a trip
   - id (uuid PK)
   - trip_id (uuid FK → trips, cascade delete)
   - name (text)
   - created_at (timestamptz)
   - unique(trip_id, name) — no duplicate names in a trip

3. `expenses` — an expense paid by one member, split among others
   - id (uuid PK)
   - trip_id (uuid FK → trips, cascade delete)
   - description (text)
   - amount (numeric(10,2), check > 0)
   - payer_id (uuid FK → members, cascade delete)
   - created_at (timestamptz)

4. `expense_splits` — which members share an expense (equal split)
   - id (uuid PK)
   - expense_id (uuid FK → expenses, cascade delete)
   - member_id (uuid FK → members, cascade delete)
   - unique(expense_id, member_id)

5. `settlements` — a payment from one member to another to settle a debt
   - id (uuid PK)
   - trip_id (uuid FK → trips, cascade delete)
   - from_member_id (uuid FK → members, cascade delete)
   - to_member_id (uuid FK → members, cascade delete)
   - amount (numeric(10,2), check > 0)
   - created_at (timestamptz)

## Security
- RLS enabled on all tables.
- No auth in this app, so policies allow anon + authenticated full CRUD
  (data is intentionally shared via trip codes).

## Notes
1. Equal-split model: each expense is divided equally among all members in expense_splits.
2. Balances are computed client-side from expenses + settlements.
3. Settlements record actual money transfers (marking a debt as settled).
*/
CREATE TABLE IF NOT EXISTS trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(trip_id, name)
);

ALTER TABLE members ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  payer_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS expense_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  UNIQUE(expense_id, member_id)
);

ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  from_member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  to_member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_members_trip_id ON members(trip_id);
CREATE INDEX IF NOT EXISTS idx_expenses_trip_id ON expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_expense_id ON expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_settlements_trip_id ON settlements(trip_id);

-- Policies: no-auth app, all data shared via trip codes
DROP POLICY IF EXISTS "anon_select_trips" ON trips;
CREATE POLICY "anon_select_trips" ON trips FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_trips" ON trips;
CREATE POLICY "anon_insert_trips" ON trips FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_trips" ON trips;
CREATE POLICY "anon_update_trips" ON trips FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_trips" ON trips;
CREATE POLICY "anon_delete_trips" ON trips FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_members" ON members;
CREATE POLICY "anon_select_members" ON members FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_members" ON members;
CREATE POLICY "anon_insert_members" ON members FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_members" ON members;
CREATE POLICY "anon_update_members" ON members FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_members" ON members;
CREATE POLICY "anon_delete_members" ON members FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_expenses" ON expenses;
CREATE POLICY "anon_select_expenses" ON expenses FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_expenses" ON expenses;
CREATE POLICY "anon_insert_expenses" ON expenses FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_expenses" ON expenses;
CREATE POLICY "anon_update_expenses" ON expenses FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_expenses" ON expenses;
CREATE POLICY "anon_delete_expenses" ON expenses FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_expense_splits" ON expense_splits;
CREATE POLICY "anon_select_expense_splits" ON expense_splits FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_expense_splits" ON expense_splits;
CREATE POLICY "anon_insert_expense_splits" ON expense_splits FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_expense_splits" ON expense_splits;
CREATE POLICY "anon_delete_expense_splits" ON expense_splits FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_settlements" ON settlements;
CREATE POLICY "anon_select_settlements" ON settlements FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_settlements" ON settlements;
CREATE POLICY "anon_insert_settlements" ON settlements FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_settlements" ON settlements;
CREATE POLICY "anon_delete_settlements" ON settlements FOR DELETE TO anon, authenticated USING (true);