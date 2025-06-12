-- Add email verification rate limiting table
CREATE TABLE IF NOT EXISTS email_verification_attempts (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    attempt_type TEXT NOT NULL CHECK (attempt_type IN ('resend', 'verify')),
    attempt_count INTEGER NOT NULL DEFAULT 1,
    last_attempt_at TIMESTAMP DEFAULT NOW(),
    lockout_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for efficient rate limiting queries
CREATE INDEX IF NOT EXISTS idx_email_verification_attempts_email_type 
ON email_verification_attempts(email, attempt_type);

CREATE INDEX IF NOT EXISTS idx_email_verification_attempts_user_type 
ON email_verification_attempts(user_id, attempt_type);

CREATE INDEX IF NOT EXISTS idx_email_verification_attempts_lockout 
ON email_verification_attempts(lockout_until) WHERE lockout_until IS NOT NULL;

-- Add index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_email_verification_attempts_created_at 
ON email_verification_attempts(created_at);
