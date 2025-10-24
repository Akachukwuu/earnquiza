/*
  # Create Claim-to-Earn Users Table

  1. New Tables
    - `users`
      - `id` (uuid, primary key) - Links to auth.users
      - `email` (text, unique) - User email address
      - `balance` (decimal) - Current ₦ balance, defaults to 0.00
      - `earn_rate` (decimal) - Amount earned per claim, defaults to 0.10
      - `last_claim` (timestamptz) - Timestamp of last successful claim
      - `claim_cooldown` (integer) - Cooldown period in hours, defaults to 6
      - `created_at` (timestamptz) - Account creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `users` table
    - Add policy for authenticated users to read their own data
    - Add policy for authenticated users to update their own balance and claim data
    - Add policy for authenticated users to insert their own profile on signup

  3. Important Notes
    - The table stores claim timing and balance information
    - Balance uses decimal type for precision in financial calculations
    - Cooldown is set to 6 hours by default
    - Users can only access and modify their own data through RLS
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  balance decimal(10, 2) DEFAULT 0.00 NOT NULL,
  earn_rate decimal(10, 2) DEFAULT 0.10 NOT NULL,
  last_claim timestamptz,
  claim_cooldown integer DEFAULT 6 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();