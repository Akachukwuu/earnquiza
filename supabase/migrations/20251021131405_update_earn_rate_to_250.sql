/*
  # Update Earn Rate to ₦250

  1. Changes
    - Update the default earn_rate from 0.10 to 250.00
    - Update existing users to have the new earn_rate of 250.00

  2. Important Notes
    - This migration updates both the default value for new users
    - And updates all existing users to the new rate
*/

-- Update the default earn_rate for new users
ALTER TABLE users 
  ALTER COLUMN earn_rate SET DEFAULT 250.00;

-- Update existing users to have the new earn_rate
UPDATE users 
  SET earn_rate = 250.00 
  WHERE earn_rate = 0.10;