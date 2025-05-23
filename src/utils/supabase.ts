import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Ensure TextEncoder is available - required by Supabase auth
if (typeof (global as any).TextEncoder === 'undefined') {
  try {
    // Try to import from text-encoding polyfill
    const TextEncodingPolyfill = require('text-encoding');
    global.TextEncoder = TextEncodingPolyfill.TextEncoder;
    global.TextDecoder = TextEncodingPolyfill.TextDecoder;
    console.log('TextEncoder polyfill applied successfully');
  } catch (error) {
    console.warn('Failed to apply TextEncoder polyfill:', error);
    // The fallback polyfills should handle this case if needed
  }
}

// Replace with your Supabase URL and anon key when actually using the app
// These values will need to be manually set since we're having issues with .env files
const supabaseUrl = 'https://hbwugavucnvpcerpwkcb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhid3VnYXZ1Y252cGNlcnB3a2NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNTQ1NDUsImV4cCI6MjA2MDczMDU0NX0.F5hc4t_6U_5W771xxxbj32L6M58EfjZpKLzfG-jMNDk';

// Create custom fetch implementation to avoid React Native issues
const customFetch = (...args: any[]) => {
  // @ts-ignore
  return fetch(...args);
};

// Create the Supabase client 
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: customFetch
  },
});

// Helper function to handle Supabase errors
export const handleSupabaseError = (error: any) => {
  console.error('Supabase error:', error?.message, error);
  
  // Handle specific database errors
  if (error?.code === '23502') { // NOT NULL constraint violation
    const details = error?.details || '';
    if (details.includes('password')) {
      return 'Password is required to create a user account';
    }
    // Extract the column name if possible
    const columnMatch = details.match(/column "([^"]+)"/);
    const column = columnMatch ? columnMatch[1] : 'A required field';
    return `${column} cannot be empty`;
  }
  
  // Handle unique constraint violations
  if (error?.code === '23505') { // UNIQUE constraint violation
    const details = error?.details || '';
    if (details.includes('email')) {
      return 'A user with this email already exists';
    }
    return 'This record already exists in the database';
  }
  
  // Handle foreign key violations
  if (error?.code === '23503') { // FOREIGN KEY constraint violation
    const details = error?.details || '';
    if (details.includes('role') && details.includes('roles')) {
      return 'The selected role is not available in the system. Please contact your administrator.';
    }
    return 'Invalid reference: A related record does not exist in the database';
  }
  
  // Handle other common errors
  if (error?.message?.includes('Network error')) {
    return 'Network error: Please check your internet connection';
  }
  
  if (error?.message?.includes('JWT expired')) {
    return 'Your session has expired. Please log in again';
  }
  
  // Authentication errors
  if (error?.message?.includes('Invalid login credentials')) {
    return 'Invalid email or password';
  }
  
  // General fallback
  return error?.message || 'An unexpected error occurred';
};

// Function to initialize roles - call this when starting the app
export const initializeRoles = async () => {
  try {
    console.log('Checking if roles table exists and has required roles...');
    
    // First check if we can access the roles table
    const { data: checkData, error: checkError } = await supabase
      .from('roles')
      .select('name')
      .limit(1);
    
    // If we can't access the table, it might not exist yet
    if (checkError) {
      console.error('Error accessing roles table:', checkError);
      console.log('Attempting to create roles table...');
      
      // Execute SQL directly to create the roles table if it doesn't exist
      const { error: createTableError } = await supabase.rpc(
        'execute_sql',
        {
          sql_query: `
            CREATE TABLE IF NOT EXISTS roles (
              id SERIAL PRIMARY KEY,
              name TEXT UNIQUE NOT NULL,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            
            -- Ensure foreign key constraint exists if the users table already exists
            DO $$
            BEGIN
              IF EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'users'
              ) AND NOT EXISTS (
                SELECT FROM information_schema.table_constraints
                WHERE constraint_name = 'users_role_fkey'
              ) THEN
                -- If users table exists but lacks the constraint, add it
                ALTER TABLE users
                ADD CONSTRAINT users_role_fkey FOREIGN KEY (role) REFERENCES roles(name);
              END IF;
            END
            $$;
          `
        }
      );
      

    }
    
    // Standard roles we want to ensure exist
    const standardRoles = ['Admin', 'Teacher', 'Student', 'Parent'];
    
    // Check what roles already exist
    const { data: existingRoles, error: getRolesError } = await supabase
      .from('roles')
      .select('name');
    
    if (getRolesError) {
      console.error('Error getting existing roles:', getRolesError);
      throw getRolesError;
    }
    
    // Find which roles need to be added
    const existingRoleNames = existingRoles?.map(r => r.name) || [];
    console.log('Existing roles:', existingRoleNames);
    
    const rolesToAdd = standardRoles.filter(role => !existingRoleNames.includes(role));
    
    if (rolesToAdd.length > 0) {
      console.log('Adding missing roles:', rolesToAdd);
      
      // Add each missing role
      const rolesToInsert = rolesToAdd.map(name => ({ name }));
      const { error: insertError } = await supabase
        .from('roles')
        .insert(rolesToInsert);
      
      if (insertError) {
        console.error('Error inserting roles:', insertError);
        throw insertError;
      }
      
      console.log('Successfully added missing roles');
    } else {
      console.log('All standard roles already exist');
    }
    
    return true;
  } catch (error) {
    console.error('Role initialization failed:', error);
    return false;
  }
}; 