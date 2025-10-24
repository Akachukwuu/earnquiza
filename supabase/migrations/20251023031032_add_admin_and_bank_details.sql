/*
  # Add admin role and bank details to users table

  1. Changes
    - Add `is_admin` column (boolean, default false) to users table
    - Add `account_name` column (text, nullable) for bank account name
    - Add `account_number` column (text, nullable) for bank account number
    - Add `bank_name` column (text, nullable) for bank name
  
  2. Security
    - Add RLS policy for admins to view all users
    - Update existing policies to allow users to update their own bank details
*/

-- Add new columns to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE users ADD COLUMN is_admin boolean DEFAULT false NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'account_name'
  ) THEN
    ALTER TABLE users ADD COLUMN account_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'account_number'
  ) THEN
    ALTER TABLE users ADD COLUMN account_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'bank_name'
  ) THEN
    ALTER TABLE users ADD COLUMN bank_name text;
  END IF;
END $$;

-- Create policy for admins to view all users
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

-- Allow users to update their own bank details
CREATE POLICY "Users can update own bank details"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);