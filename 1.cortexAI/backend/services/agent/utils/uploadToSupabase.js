import { supabase } from '../config/supabaseClient.js'

export const uploadToSupabase = async (filename, buffer, contentType) => {
    if (!supabase) {
        throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in your environment.')
    }

    const bucketName = process.env.SUPABASE_BUCKET_NAME || 'AskAI-agent'

    const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filename, buffer, {
            contentType: contentType,
            upsert: true
        })

    if (error) {
        throw new Error(`Supabase upload failed: ${error.message}`)
    }

    return filename
}