// src/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ziedmgioccnjkptbczrg.supabase.co'
const supabaseKey = 'sb_publishable_Yb7FU_JpknEFduV47KFR1A_V8ZILZTk'  // tu anon key completa

export const supabase = createClient(supabaseUrl, supabaseKey)