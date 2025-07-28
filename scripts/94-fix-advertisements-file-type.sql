-- Fix the advertisements table file_type constraint to match expected values
-- and convert any existing 'mp4' entries to 'video'

-- First, update any existing 'mp4' entries to 'video'
UPDATE advertisements 
SET file_type = 'video' 
WHERE file_type = 'mp4';

-- Drop the existing constraint
ALTER TABLE advertisements 
DROP CONSTRAINT IF EXISTS advertisements_file_type_check;

-- Add the new constraint with correct values
ALTER TABLE advertisements 
ADD CONSTRAINT advertisements_file_type_check 
CHECK (file_type IN ('video', 'gif', 'image'));

-- Add comment for clarity
COMMENT ON COLUMN advertisements.file_type IS 'Type of advertisement file: video (MP4), gif, or image (PNG/JPG)';
