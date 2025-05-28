-- Create table for storing push tokens if it doesn't exist
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  device_id TEXT,
  platform TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(token)
);

-- Add expo_push_token column to users table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'expo_push_token'
  ) THEN
    ALTER TABLE users ADD COLUMN expo_push_token TEXT;
  END IF;
END
$$;

-- Grant access to the table via RLS
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own push tokens
CREATE POLICY push_tokens_user_policy ON push_tokens
  FOR ALL
  USING (auth.uid() = user_id);

-- Create a function to trigger push notifications for scores
CREATE OR REPLACE FUNCTION trigger_score_push_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  student_id UUID;
BEGIN
  -- Get the student ID from the score record
  student_id := NEW.student_id;

  -- Call the Edge Function to send the push notification
  PERFORM
    net.http_post(
      url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/push-notifications',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', current_setting('request.headers')::json->>'authorization'
      ),
      body:=jsonb_build_object(
        'type', 'score',
        'recordId', NEW.id,
        'studentId', student_id,
        'tableSchema', TG_TABLE_SCHEMA,
        'tableName', TG_TABLE_NAME
      )
    );

  RETURN NEW;
END;
$$;

-- Create a function to trigger push notifications for attendance
CREATE OR REPLACE FUNCTION trigger_attendance_push_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  student_id UUID;
BEGIN
  -- Get the student ID from the attendance record
  student_id := NEW.student_id;

  -- Call the Edge Function to send the push notification
  PERFORM
    net.http_post(
      url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/push-notifications',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', current_setting('request.headers')::json->>'authorization'
      ),
      body:=jsonb_build_object(
        'type', 'attendance',
        'recordId', NEW.id,
        'studentId', student_id,
        'tableSchema', TG_TABLE_SCHEMA,
        'tableName', TG_TABLE_NAME
      )
    );

  RETURN NEW;
END;
$$;

-- Create triggers on scores table for insert and update events
DROP TRIGGER IF EXISTS scores_push_notification_trigger ON scores;
CREATE TRIGGER scores_push_notification_trigger
  AFTER INSERT OR UPDATE
  ON scores
  FOR EACH ROW
  EXECUTE FUNCTION trigger_score_push_notification();

-- Create triggers on attendance table for insert and update events
DROP TRIGGER IF EXISTS attendance_push_notification_trigger ON attendance;
CREATE TRIGGER attendance_push_notification_trigger
  AFTER INSERT OR UPDATE
  ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION trigger_attendance_push_notification();

-- NOTE: You need to replace 'YOUR_PROJECT_REF' with your actual Supabase project reference
-- Example: https://abcdefg.supabase.co/functions/v1/push-notifications