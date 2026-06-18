import { User, Role } from '../types';
import { supabase, handleSupabaseError } from './supabaseService';

// Supabase-based Authentication

export const getUsers = async (): Promise<User[]> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
};

export const saveUser = async (user: User): Promise<void> => {
  try {
    const { error } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        username: user.username,
        password: user.password, // In production, use proper hashing on backend
        name: user.name,
        role: user.role,
      }, { onConflict: 'id' });

    if (error) throw error;

    // Update session if editing self
    const current = getCurrentUser();
    if (current && current.id === user.id) {
      localStorage.setItem('zinetherp_session', JSON.stringify(user));
    }
  } catch (error) {
    throw new Error(handleSupabaseError(error));
  }
};

export const deleteUser = async (userId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) throw error;
  } catch (error) {
    throw new Error(handleSupabaseError(error));
  }
};

export const login = async (username: string, password: string): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single();

    if (error || !data) return null;

    const user: User = data;
    localStorage.setItem('zinetherp_session', JSON.stringify(user));
    return user;
  } catch (error) {
    console.error('Login error:', error);
    return null;
  }
};

export const logout = (): void => {
  localStorage.removeItem('zinetherp_session');
};

export const getCurrentUser = (): User | null => {
  const stored = localStorage.getItem('zinetherp_session');
  return stored ? JSON.parse(stored) : null;
};