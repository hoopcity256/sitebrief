import { supabase } from './supabase'

export const signUp = async (email: string, password: string) => {
  return await supabase.auth.signUp({ email, password })
}

export const signIn = async (email: string, password: string) => {
  return await supabase.auth.signInWithPassword({ email, password })
}

export const signOut = async () => {
  return await supabase.auth.signOut()
}

export const resetPassword = async (email: string) => {
  return await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/update-password'
  })
}

export const updatePassword = async (newPassword: string) => {
  return await supabase.auth.updateUser({ password: newPassword })
}

export const getSession = async () => {
  return await supabase.auth.getSession()
}

export const onAuthStateChange = (callback: (event: any, session: any) => void) => {
  return supabase.auth.onAuthStateChange(callback)
}
