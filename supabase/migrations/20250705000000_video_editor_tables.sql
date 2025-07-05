-- Create video edits table
CREATE TABLE IF NOT EXISTS video_edits (
    id TEXT PRIMARY KEY,
    video_id UUID NOT NULL REFERENCES user_videos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    operations JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
    preview_url TEXT,
    output_url TEXT,
    error_message TEXT,
    processing_time_seconds INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_video_edits_video_id ON video_edits(video_id);
CREATE INDEX IF NOT EXISTS idx_video_edits_user_id ON video_edits(user_id);
CREATE INDEX IF NOT EXISTS idx_video_edits_status ON video_edits(status);
CREATE INDEX IF NOT EXISTS idx_video_edits_created_at ON video_edits(created_at);

-- Enable Row Level Security
ALTER TABLE video_edits ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for video_edits
CREATE POLICY "Users can view their own video edits" ON video_edits
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own video edits" ON video_edits
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own video edits" ON video_edits
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own video edits" ON video_edits
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_video_edits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_video_edits_updated_at
    BEFORE UPDATE ON video_edits
    FOR EACH ROW
    EXECUTE FUNCTION update_video_edits_updated_at();

-- Add video_processing_results table if it doesn't exist
CREATE TABLE IF NOT EXISTS video_processing_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    video_id UUID NOT NULL REFERENCES user_videos(id) ON DELETE CASCADE,
    processing_id TEXT NOT NULL,
    stage TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    results JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for video_processing_results
CREATE INDEX IF NOT EXISTS idx_video_processing_results_video_id ON video_processing_results(video_id);
CREATE INDEX IF NOT EXISTS idx_video_processing_results_processing_id ON video_processing_results(processing_id);
CREATE INDEX IF NOT EXISTS idx_video_processing_results_status ON video_processing_results(status);

-- Enable RLS for video_processing_results
ALTER TABLE video_processing_results ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for video_processing_results
CREATE POLICY "Users can view processing results for their videos" ON video_processing_results
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_videos 
            WHERE user_videos.id = video_processing_results.video_id 
            AND user_videos.user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert processing results" ON video_processing_results
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update processing results" ON video_processing_results
    FOR UPDATE USING (true);

-- Update function for video_processing_results
CREATE OR REPLACE FUNCTION update_video_processing_results_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for video_processing_results updated_at
CREATE TRIGGER update_video_processing_results_updated_at
    BEFORE UPDATE ON video_processing_results
    FOR EACH ROW
    EXECUTE FUNCTION update_video_processing_results_updated_at();