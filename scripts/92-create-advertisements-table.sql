-- Create the advertisements table
CREATE TABLE IF NOT EXISTS public.advertisements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    streamer_wallet_address text NOT NULL UNIQUE,
    file_path text NOT NULL,
    file_type text NOT NULL CHECK (file_type IN ('mp4', 'gif')),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT advertisements_streamer_wallet_address_fkey FOREIGN KEY (streamer_wallet_address) REFERENCES public.users(wallet_address) ON DELETE CASCADE
);

-- Add comments for clarity
COMMENT ON TABLE public.advertisements IS 'Stores custom advertisements uploaded by streamers.';
COMMENT ON COLUMN public.advertisements.streamer_wallet_address IS 'The wallet address of the streamer who owns the ad.';
COMMENT ON COLUMN public.advertisements.file_path IS 'The URL path to the ad file in Vercel Blob storage.';
COMMENT ON COLUMN public.advertisements.file_type IS 'The type of the ad file, either "mp4" or "gif".';

-- Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_advertisements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_advertisements_updated
BEFORE UPDATE ON public.advertisements
FOR EACH ROW
EXECUTE FUNCTION public.handle_advertisements_updated_at();

-- Enable Row Level Security
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow public read access for active ads
CREATE POLICY "Allow public read access for active ads"
ON public.advertisements
FOR SELECT
USING (is_active = true);

-- Allow owners to manage their own ads
CREATE POLICY "Allow owners to insert their own ad"
ON public.advertisements
FOR INSERT
WITH CHECK (auth.jwt() ->> 'sub' = (SELECT id::text FROM users WHERE wallet_address = streamer_wallet_address));

CREATE POLICY "Allow owners to update their own ad"
ON public.advertisements
FOR UPDATE
USING (auth.jwt() ->> 'sub' = (SELECT id::text FROM users WHERE wallet_address = streamer_wallet_address));

CREATE POLICY "Allow owners to delete their own ad"
ON public.advertisements
FOR DELETE
USING (auth.jwt() ->> 'sub' = (SELECT id::text FROM users WHERE wallet_address = streamer_wallet_address));
