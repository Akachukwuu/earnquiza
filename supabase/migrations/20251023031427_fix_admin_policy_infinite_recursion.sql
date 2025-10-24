/*
  # Fix infinite recursion in admin policy

  1. Changes
    - Drop the problematic "Admins can view all users" policy
    - Create a new policy that allows users to view their own data
    - Create a separate policy for admins using a security definer function
  
  2. Security
    - Users can always view their own data
    - Admins can view all users through a helper function
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Admins can view all users" ON users;

-- Create a security definer function to check admin status
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND is_admin = true
  );
END;
$$;

-- Allow users to view their own data
CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow admins to view all users
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (is_admin());