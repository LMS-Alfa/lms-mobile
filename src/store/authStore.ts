import { create } from 'zustand';
import { supabase, handleSupabaseError } from '../utils/supabase';

export type UserRole = string;

export interface User {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  lastLogin?: string | null;
  status?: 'active' | 'pending' | 'invited' | null;
  parent_id?: string | null;
  childrenIds?: string[] | null;
}

export interface Role {
  name: string;
  description?: string;
}

export interface AuthState {
  user: User | null;
  session: any;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  allUsers: User[];
  loadingUsers: boolean;
  usersError: string | null;
  creatingUser: boolean;
  createUserError: string | null;
  updatingUser: boolean;
  updateUserError: string | null;
  deletingUser: boolean;
  deleteUserError: string | null;
  availableRoles: Role[];
  loadingRoles: boolean;
  rolesError: string | null;
  
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  fetchAllUsers: () => Promise<void>;
  fetchAvailableRoles: () => Promise<void>;
  createUser: (userData: Omit<User, 'id' | 'lastLogin' | 'status'> & { 
    password: string; 
    role: UserRole; 
    email: string; 
    firstName: string; 
    lastName: string; 
    status: 'active' | 'inactive';
    parent_id?: string | null;
    childrenIds?: string[] | null;
  }) => Promise<boolean>;
  clearCreateUserError: () => void;
  updateUser: (userId: string, userData: Partial<Omit<User, 'id'>> & { 
    password?: string;
    parent_id?: string | null;
    childrenIds?: string[] | null;
  }) => Promise<boolean>;
  clearUpdateUserError: () => void;
  deleteUser: (userId: string) => Promise<boolean>;
  clearDeleteUserError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: false,
  error: null,
  initialized: false,
  allUsers: [],
  loadingUsers: false,
  usersError: null,
  creatingUser: false,
  createUserError: null,
  updatingUser: false,
  updateUserError: null,
  deletingUser: false,
  deleteUserError: null,
  availableRoles: [],
  loadingRoles: false,
  rolesError: null,

  initialize: async () => {
    console.log('[AuthStore] Initializing...');
    try {
      set({ loading: true, error: null });

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('[AuthStore] getSession response:', { session, sessionError });

      if (sessionError) {
        console.error('[AuthStore] Error getting session:', sessionError);
        set({ user: null, session: null, error: handleSupabaseError(sessionError), loading: false, initialized: true });
        return;
      }

      if (session) {
        console.log('[AuthStore] Session found. Fetching user profile...', session.user.id);
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, email, role, firstName, lastName, lastLogin, status, parent_id')
          .eq('id', session.user.id)
          .single();
        
        console.log('[AuthStore] User profile fetch response:', { userData, userError });

        if (userError) {
          console.error('[AuthStore] Error fetching user profile:', userError);
          await supabase.auth.signOut();
          set({ user: null, session: null, error: 'Failed to load user profile. Please log in again.', loading: false, initialized: true });
          return;
        }

        if (userData) {
          const rawUserRole = userData.role;
          if (typeof rawUserRole === 'string') {
            const userRoleLowercase = rawUserRole.toLowerCase() as UserRole;
            
            // Fetch roles to verify the role is valid
            await get().fetchAvailableRoles();
            const availableRoles = get().availableRoles;
            const isValidRole = availableRoles.some(r => r.name.toLowerCase() === userRoleLowercase);

            if (isValidRole) {
              console.log(`[AuthStore] User profile fetched successfully. Original role: "${rawUserRole}", validated as: "${userRoleLowercase}"`);
          set({
            user: {
              id: session.user.id,
              email: session.user.email!,
                  role: userRoleLowercase,
                  firstName: userData.firstName,
                  lastName: userData.lastName,
                  lastLogin: (userData as any).lastLogin || null,
                  status: (userData as any).status || null,
                  parent_id: userData.parent_id || null,
                  childrenIds: [] as string[] | null
            },
            session,
            error: null,
          });
        } else {
              console.warn(`[AuthStore] User ${session.user.id} has missing or invalid role: Original="${rawUserRole}". Signing out.`);
              await supabase.auth.signOut();
              set({ user: null, session: null, error: 'Your user profile has an invalid role. Please log in again.' });
            }
          } else {
            console.warn(`[AuthStore] User ${session.user.id} has a role that is not a string: "${rawUserRole}". Signing out.`);
            await supabase.auth.signOut();
            set({ user: null, session: null, error: 'Your user profile role is invalid. Please log in again.' });
          }
        } else {
          console.warn(`[AuthStore] User profile data not found in 'users' table for session user ${session.user.id}. Signing out.`);
          await supabase.auth.signOut();
          set({ user: null, session: null, error: 'User profile not found. Please log in again.' });
        }
      } else {
        console.log('[AuthStore] No active session found.');
        set({ user: null, session: null, error: null });
      }
    } catch (error: any) {
      console.error('[AuthStore] Unexpected error during initialization:', error);
      try { await supabase.auth.signOut(); } catch (e) { /* ignore signout error */ }
      set({ user: null, session: null, error: handleSupabaseError(error) });
    } finally {
      set({ loading: false, initialized: true });
      console.log('[AuthStore] Initialization complete. Current state:', get());
    }
  },

  fetchAvailableRoles: async () => {
    console.log('[AuthStore] Fetching available roles...');
    try {
      set({ loadingRoles: true, rolesError: null });
      
      const { data, error } = await supabase
        .from('roles')
        .select('name, description');
      
      if (error) {
        console.error('[AuthStore] Error fetching roles:', error);
        throw error;
      }
      
      if (data && data.length > 0) {
        // Transform data to include a default label if one isn't provided
        const processedRoles = data.map(role => ({
          name: role.name,
          description: role.description || role.name.charAt(0).toUpperCase() + role.name.slice(1)
        }));
        
        console.log('[AuthStore] Available roles fetched:', processedRoles);
        set({ availableRoles: processedRoles, loadingRoles: false });
      } else {
        console.warn('[AuthStore] No roles found in database');
        set({ availableRoles: [], loadingRoles: false });
      }
    } catch (error: any) {
      console.error('[AuthStore] Error in fetchAvailableRoles:', error);
      set({ 
        rolesError: handleSupabaseError(error) || 'Failed to fetch roles',
        loadingRoles: false
      });
    }
  },

  login: async (email: string, password: string) => {
    console.log(`[AuthStore] Attempting login for: ${email}`);
    try {
      set({ loading: true, error: null });

      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      console.log('[AuthStore] signInWithPassword response:', { data, error: loginError });

      if (loginError) throw loginError;

      if (data.session && data.user) {
        console.log('[AuthStore] Login successful, fetching user profile...', data.user.id);
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, email, role, firstName, lastName, lastLogin, status, parent_id')
          .eq('id', data.user.id)
          .single();
        
        console.log('[AuthStore] User profile fetch response after login:', { userData, userError });

        if (userError) {
          console.error('[AuthStore] Error fetching user profile post-login:', userError);
          await supabase.auth.signOut();
          throw new Error('Failed to load user profile after login.');
        }

        if (userData) {
          const rawUserRole = userData.role;
          if (typeof rawUserRole === 'string') {
            const userRoleLowercase = rawUserRole.toLowerCase() as UserRole;
            
            // Fetch roles to verify the role is valid
            await get().fetchAvailableRoles();
            const availableRoles = get().availableRoles;
            const isValidRole = availableRoles.some(r => r.name.toLowerCase() === userRoleLowercase);

            if (isValidRole) {
              console.log(`[AuthStore] User profile after login fetched successfully. Original role: "${rawUserRole}", validated as: "${userRoleLowercase}"`);
          set({
            user: {
              id: data.user.id,
              email: data.user.email!,
                  role: userRoleLowercase,
              firstName: userData.firstName, 
              lastName: userData.lastName,  
                  lastLogin: (userData as any).lastLogin || null,
                  status: (userData as any).status || null,
                  parent_id: userData.parent_id || null,
                  childrenIds: [] as string[] | null
            },
            session: data.session,
            error: null,
          });
            } else {
              console.warn(`[AuthStore] User ${data.user.id} after login has missing or invalid role: Original="${rawUserRole}". Signing out.`);
              await supabase.auth.signOut();
              set({ user: null, session: null, error: 'Your user profile has an invalid role. Please contact support.' });
            }
          } else {
            console.warn(`[AuthStore] User ${data.user.id} after login has a role that is not a string: "${rawUserRole}". Signing out.`);
            await supabase.auth.signOut();
            set({ user: null, session: null, error: 'Your user profile role is invalid. Please contact support.' });
          }
        } else {
           console.warn('[AuthStore] User profile data not found after login despite successful auth. Signing out.');
           await supabase.auth.signOut();
           set({user: null, session: null, error: 'User profile not found after login. Please contact support.'});
        }
      } else {
        console.warn('[AuthStore] Login completed but no session or user data in response from Supabase.');
        set({ user: null, session: null, error: 'Login failed: No session data returned from authentication service.'});
      }
    } catch (error: any) {
      console.error('[AuthStore] Login error:', error.message, error);
      if (get().session || get().user) { 
          try { await supabase.auth.signOut(); } catch (e) { /* ignore */ }
      }
      set({ user: null, session: null, error: handleSupabaseError(error) || 'Login failed.' });
    } finally {
      set({ loading: false });
      console.log('[AuthStore] Login process complete. Current state:', get());
    }
  },

  logout: async () => {
    console.log('[AuthStore] Logging out...');
    try {
      set({ loading: true, error: null });
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      console.log('[AuthStore] SignOut successful.');
      set({ user: null, session: null, error: null });
    } catch (error: any) {
      console.error('[AuthStore] Logout error:', error.message);
      set({ error: handleSupabaseError(error) || 'Logout failed.' });
    } finally {
      set({ loading: false });
      console.log('[AuthStore] Logout process complete. Current state:', get());
    }
  },

  clearError: () => {
    console.log('[AuthStore] Clearing error.');
    set({ error: null });
  },

  fetchAllUsers: async () => {
    console.log('[AuthStore] Fetching all users...');
    try {
      set({ loadingUsers: true, usersError: null });
      const { data: allUsers, error } = await supabase
        .from('users')
        .select('*')
        .order('createdAt', { ascending: false });

      if (error) {
        console.error('Failed to fetch users:', error.message);
        throw error;
      }

      console.log(`fetchAllUsers: Successfully fetched ${allUsers.length} users, including ${allUsers.filter(u => u.role?.toLowerCase() === 'student').length} students`);
      
      // Extract the parent-child relationships 
      const processedUsers = allUsers.map(u => {
        const user = {
          ...u,
          role: u.role as UserRole,
          lastLogin: (u as any).lastLogin || null,
          status: (u as any).status || null,
          parent_id: u.parent_id || null,
          childrenIds: [] as string[] | null
        };
        return user;
      });

      // Add childrenIds for parent users
      processedUsers.forEach(user => {
        if (user.role.toLowerCase() === 'parent') {
          // Find all students that have this parent_id
          user.childrenIds = processedUsers
            .filter(u => u.role.toLowerCase() === 'student' && u.parent_id === user.id)
            .map(u => u.id);
        }
      });

      console.log('[AuthStore] All users fetched successfully:', processedUsers.length);
      set({ allUsers: processedUsers, loadingUsers: false });
    } catch (error: any) {
      console.error('[AuthStore] Catch block: Error fetching all users:', error.message);
      set({ usersError: handleSupabaseError(error) || 'Failed to fetch users.', loadingUsers: false });
    } finally {
      console.log('[AuthStore] Fetch all users process complete. Current state relevant part:', { allUsers: get().allUsers.length, loadingUsers: get().loadingUsers, usersError: get().usersError });
    }
  },

  createUser: async (userData) => {
    console.log('[AuthStore] Attempting to create user:', userData);
    set({ creatingUser: true, createUserError: null });
    try {
      // Before creating the user, check if the role exists in the roles table
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('name')
        .eq('name', userData.role)
        .single();

      if (roleError && roleError.code !== 'PGRST116') { // Not single row error is OK here
        console.error('[AuthStore] Error checking role existence:', roleError);
        throw new Error(`Role validation failed: ${handleSupabaseError(roleError)}`);
      }

      if (!roleData) {
        console.log('[AuthStore] Role not found, attempting to use default role');
        // Try to get available roles from the database
        const { data: availableRoles, error: rolesError } = await supabase
          .from('roles')
          .select('name');

        if (rolesError) {
          throw new Error(`Unable to fetch roles: ${handleSupabaseError(rolesError)}`);
        }

        if (!availableRoles || availableRoles.length === 0) {
          throw new Error('No roles are defined in the system. Please contact your administrator.');
        }

        // Log available roles
        console.log('[AuthStore] Available roles:', availableRoles);
        
        // Use a sensible default if available (like 'user'), or pick the first role
        const defaultRole = availableRoles.find(r => r.name === 'user') || availableRoles[0];
        console.log(`[AuthStore] Using default role: ${defaultRole.name}`);
        
        // Update userData to use this role
        userData = { ...userData, role: defaultRole.name as UserRole };
      }

      // Step 1: Create the user in Supabase Auth using admin API to prevent session changes
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password!, 
        email_confirm: true, // Auto-confirm the email to allow immediate login
      });

      if (authError) {
        console.error('[AuthStore] Error creating new user in Supabase Auth:', authError);
        throw authError;
      }

      if (!authData.user) {
        console.error('[AuthStore] No user returned from Supabase Auth createUser.');
        throw new Error('User creation failed: No user data returned from authentication service.');
      }

      const userId = authData.user.id;
      console.log('[AuthStore] User created in Supabase Auth successfully. User ID:', userId);

      // Step 2: Insert user profile into public.users table
      const userProfileData: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: UserRole;
        status: 'active' | 'inactive';
        password: string;
        parent_id?: string | null;
      } = {
        id: userId, // Use the ID from the auth.users table
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        status: userData.status, // Directly use the now non-optional status
        password: userData.password, // Include the password field to satisfy the not-null constraint
      };
      
      // Add parent_id if student role and parent_id provided
      if (userData.role.toLowerCase() === 'student' && userData.parent_id) {
        userProfileData.parent_id = userData.parent_id;
      }

      const { error: profileError } = await supabase
        .from('users')
        .insert(userProfileData);

      if (profileError) {
        console.error('[AuthStore] Error inserting user profile into public.users:', profileError);
        // Attempt to delete the auth user if profile insertion fails to keep things clean
        try {
          await supabase.auth.admin.deleteUser(userId);
          console.log('[AuthStore] Cleaned up auth user after profile creation failure');
        } catch (cleanupError) {
          console.error('[AuthStore] Could not clean up auth user:', cleanupError);
        }
        throw profileError;
      }

      console.log('[AuthStore] User profile created in public.users successfully.');

      // Step 3: If this is a parent user and childrenIds are provided, update the children's parent_id
      if (userData.role.toLowerCase() === 'parent' && userData.childrenIds && userData.childrenIds.length > 0) {
        console.log('[AuthStore] Updating children parent_id for new parent user:', userData.childrenIds);
        
        for (const childId of userData.childrenIds) {
          const { error: updateChildError } = await supabase
            .from('users')
            .update({ parent_id: userId })
            .eq('id', childId)
            .eq('role', 'student'); // Only update if the user is a student
          
          if (updateChildError) {
            console.error(`[AuthStore] Error updating parent_id for child ${childId}:`, updateChildError);
            // Continue with other children even if one fails
          }
        }
      }

      // Step 4: Refresh the list of all users
      await get().fetchAllUsers();

      set({ creatingUser: false, createUserError: null });
      console.log('[AuthStore] User creation process successful.');
      return true; // Indicate success

    } catch (error: any) {
      console.error('[AuthStore] Create user error:', error.message, error);
      set({ creatingUser: false, createUserError: handleSupabaseError(error) || 'Failed to create user.' });
      return false; // Indicate failure
    }
  },

  clearCreateUserError: () => {
    console.log('[AuthStore] Clearing createUserError.');
    set({ createUserError: null });
  },

  updateUser: async (userId, userData) => {
    console.log('[AuthStore] Attempting to update user:', userId, userData);
    set({ updatingUser: true, updateUserError: null });
    try {
      const updates: Record<string, any> = {};
      
      // Only include fields that were provided
      if (userData.email !== undefined) updates.email = userData.email;
      if (userData.firstName !== undefined) updates.firstName = userData.firstName;
      if (userData.lastName !== undefined) updates.lastName = userData.lastName;
      if (userData.role !== undefined) updates.role = userData.role;
      if (userData.status !== undefined) updates.status = userData.status;
      
      // Include parent_id if provided
      if (userData.parent_id !== undefined) {
        updates.parent_id = userData.parent_id;
      }
      
      // Check if we need to update auth and profile
      const needsAuthUpdate = userData.email !== undefined || userData.password !== undefined;
      const needsProfileUpdate = Object.keys(updates).length > 0;
      
      // Update the user auth if email or password changed
      if (needsAuthUpdate) {
        const authUpdates: { email?: string; password?: string } = {};
        if (userData.email !== undefined) authUpdates.email = userData.email;
        if (userData.password !== undefined) authUpdates.password = userData.password;
        
        // Admin can update any user - requires admin privileges
        const { error: authError } = await supabase.auth.admin.updateUserById(
          userId,
          authUpdates
        );
        
        if (authError) {
          console.error('[AuthStore] Error updating user auth:', authError);
          throw authError;
        }
        
        console.log('[AuthStore] User auth updated successfully');
      }
      
      // Update the user profile in the public.users table
      if (needsProfileUpdate) {
        // If password was included, we need to update it in users table too
        if (userData.password !== undefined) {
          updates.password = userData.password;
        }
        
        // If updating role, check if it exists
        if (userData.role !== undefined) {
          const { data: roleData, error: roleError } = await supabase
            .from('roles')
            .select('name')
            .eq('name', userData.role)
            .single();
    
          if (roleError && roleError.code !== 'PGRST116') {
            console.error('[AuthStore] Error checking role existence:', roleError);
            throw new Error(`Role validation failed: ${handleSupabaseError(roleError)}`);
          }
    
          if (!roleData) {
            console.log('[AuthStore] Role not found, checking available roles');
            const { data: availableRoles, error: rolesError } = await supabase
              .from('roles')
              .select('name');
    
            if (rolesError) {
              throw new Error(`Unable to fetch roles: ${handleSupabaseError(rolesError)}`);
            }
    
            if (!availableRoles || availableRoles.length === 0) {
              throw new Error('No roles are defined in the system. Please contact your administrator.');
            }
    
            console.log('[AuthStore] Available roles:', availableRoles);
            
            // Use default role like we do in createUser
            const defaultRole = availableRoles.find(r => r.name === 'user') || availableRoles[0];
            console.log(`[AuthStore] Using default role: ${defaultRole.name}`);
            
            updates.role = defaultRole.name;
          }
        }
        
        const { error: profileError } = await supabase
          .from('users')
          .update(updates)
          .eq('id', userId);
        
        if (profileError) {
          console.error('[AuthStore] Error updating user profile:', profileError);
          throw profileError;
        }
        
        console.log('[AuthStore] User profile updated successfully');
      }
      
      // Handle childrenIds update for parent users
      if (userData.role && userData.role.toLowerCase() === 'parent' && userData.childrenIds !== undefined) {
        console.log('[AuthStore] Updating children for parent user:', userData.childrenIds);
        
        // 1. Get current children that have this parent's ID
        const { data: currentChildren, error: fetchError } = await supabase
          .from('users')
          .select('id')
          .eq('parent_id', userId)
          .eq('role', 'student');
        
        if (fetchError) {
          console.error('[AuthStore] Error fetching current children:', fetchError);
          throw fetchError;
        }
        
        const currentChildIds = currentChildren?.map(child => child.id) || [];
        console.log('[AuthStore] Current children:', currentChildIds);
        
        // 2. Find children to add and remove
        const childrenToAdd = userData.childrenIds?.filter(id => !currentChildIds.includes(id)) || [];
        const childrenToRemove = currentChildIds.filter(id => !userData.childrenIds?.includes(id));
        
        console.log('[AuthStore] Children to add:', childrenToAdd);
        console.log('[AuthStore] Children to remove:', childrenToRemove);
        
        // 3. Update children to add (set parent_id to this user's ID)
        for (const childId of childrenToAdd) {
          const { error: addError } = await supabase
            .from('users')
            .update({ parent_id: userId })
            .eq('id', childId)
            .eq('role', 'student');
          
          if (addError) {
            console.error(`[AuthStore] Error adding child ${childId}:`, addError);
          }
        }
        
        // 4. Update children to remove (set parent_id to null)
        for (const childId of childrenToRemove) {
          const { error: removeError } = await supabase
            .from('users')
            .update({ parent_id: null })
            .eq('id', childId)
            .eq('parent_id', userId); // Only update if this parent was actually the parent
          
          if (removeError) {
            console.error(`[AuthStore] Error removing child ${childId}:`, removeError);
          }
        }
      }
      
      // Refresh user list after update
      await get().fetchAllUsers();
      
      // If the currently logged-in user was updated, refresh the session
      if (get().user?.id === userId) {
        console.log('[AuthStore] Updated the current user, refreshing session');
        await get().initialize();
      }
      
      set({ updatingUser: false, updateUserError: null });
      return true;
      
    } catch (error: any) {
      console.error('[AuthStore] Update user error:', error.message, error);
      set({ updatingUser: false, updateUserError: handleSupabaseError(error) || 'Failed to update user.' });
      return false;
    }
  },

  clearUpdateUserError: () => {
    console.log('[AuthStore] Clearing updateUserError.');
    set({ updateUserError: null });
  },

  deleteUser: async (userId) => {
    console.log('[AuthStore] Attempting to delete user:', userId);
    set({ deletingUser: true, deleteUserError: null });
    try {
      // First delete from users table to maintain referential integrity
      const { error: profileError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);
      
      if (profileError) {
        console.error('[AuthStore] Error deleting user profile:', profileError);
        throw profileError;
      }
      
      // Then delete from auth.users
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      
      if (authError) {
        console.error('[AuthStore] Error deleting user from auth:', authError);
        console.warn('[AuthStore] User profile was deleted but auth user remains');
        throw authError;
      }
      
      console.log('[AuthStore] User deleted successfully');
      
      // Refresh the user list
      await get().fetchAllUsers();
      
      set({ deletingUser: false, deleteUserError: null });
      return true;
      
    } catch (error: any) {
      console.error('[AuthStore] Delete user error:', error.message, error);
      set({ deletingUser: false, deleteUserError: handleSupabaseError(error) || 'Failed to delete user.' });
      return false;
    }
  },

  clearDeleteUserError: () => {
    console.log('[AuthStore] Clearing deleteUserError.');
    set({ deleteUserError: null });
  },
})); 