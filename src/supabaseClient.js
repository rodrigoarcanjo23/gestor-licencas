import { createClient } from '@supabase/supabase-js'

// --- COLOQUE AS STRINGS DIRETAS AQUI ---
const supabaseUrl = 'https://msrxijlattoajnfomlbw.supabase.co'
const supabaseKey = 'sb_publishable_tMb8fJpVvkmc9ZwLVkl3Ew_UIqvTQQE' 
// (Essa chave 'anon' é pública, não tem perigo grave de ficar no app por enquanto)

export const supabase = createClient(supabaseUrl, supabaseKey)