import { createClient } from '@supabase/supabase-js'

const normalizeSupabaseUrl = (url) => {
    if (!url) return 'https://your-project-ref.supabase.co'
    return url.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '')
}

const supabaseUrl = normalizeSupabaseUrl(process.env.SUPABASE_URL)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    })
    : null