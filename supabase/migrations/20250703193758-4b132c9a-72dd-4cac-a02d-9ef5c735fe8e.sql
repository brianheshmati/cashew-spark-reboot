-- Check current foreign key constraints on applications table
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.applications'::regclass 
    AND contype = 'f';

-- Drop the incorrect foreign key constraint
ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_user_id_fkey;

-- Add the correct foreign key constraint referencing auth.users
ALTER TABLE public.applications 
ADD CONSTRAINT applications_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;