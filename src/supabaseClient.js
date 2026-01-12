import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://msrxijlattoajnfomlbw.supabase.co'
const supabaseKey = 'sb_publishable_tMb8fJpVvkmc9ZwLVkl3Ew_UIqvTQQE'

export const supabase = createClient(supabaseUrl, supabaseKey)  