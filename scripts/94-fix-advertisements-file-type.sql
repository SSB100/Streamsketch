-- Fix the file_type constraint to match the expected values
-- Drop the existing constraint
ALTER TABLE advertisements DROP CONSTRAINT IF EXISTS advertisements_file_type_check;

-- Add the correct constraint with proper enum values
ALTER TABLE advertisements ADD CONSTRAINT advertisements_file_type_check 
CHECK (file_type IN ('video', 'gif', 'image'));

-- Update any existing 'mp4' values to 'video' to match the new constraint
UPDATE advertisements SET file_type = 'video' WHERE file_type = 'mp4';
