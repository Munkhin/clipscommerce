-- Autoposting Schema

CREATE TABLE autopost_schedule (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    platform VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    media_urls TEXT[],
    post_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(255) DEFAULT 'scheduled',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE user_social_credentials (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    platform VARCHAR(255) NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
