-- Create advertisements table
CREATE TABLE IF NOT EXISTS public.advertisements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_code TEXT NOT NULL REFERENCES public.sessions(code) ON DELETE CASCADE,
    owner_wallet_address TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view advertisements for sessions they can access" ON public.advertisements
    FOR SELECT USING (
        session_code IN (
            SELECT code FROM public.sessions 
            WHERE owner_wallet_address = auth.jwt() ->> 'wallet_address'
            OR is_public = true
        )
    );

CREATE POLICY "Users can manage their own advertisements" ON public.advertisements
    FOR ALL USING (owner_wallet_address = auth.jwt() ->> 'wallet_address');

-- Create function to get active advertisement for a session
CREATE OR REPLACE FUNCTION get_active_ad_for_session(p_session_code TEXT)
RETURNS TABLE (
    id UUID,
    file_url TEXT,
    file_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.file_url,
        a.file_type,
        a.created_at
    FROM public.advertisements a
    WHERE a.session_code = p_session_code 
    AND a.is_active = true
    ORDER BY a.created_at DESC
    LIMIT 1;
END;
$$;
