import { supabase } from '../config/supabaseClient.js'

export const getFromSupabase = async (filename, expiresIn = 600) => {
    if (!supabase) {
        throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in your environment.')
    }

    const bucketName = process.env.SUPABASE_BUCKET_NAME || 'AskAI-agent'

    const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(filename, expiresIn)

    if (error) {
        throw new Error(`Failed to generate signed URL: ${error.message}`)
    }

    return data.signedUrl
}