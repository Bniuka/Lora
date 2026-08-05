// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Verify Authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // @ts-ignore
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: authError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // 2. Get Cloudflare Credentials
    // @ts-ignore
    const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID')
    // @ts-ignore
    const apiToken = Deno.env.get('CLOUDFLARE_API_TOKEN')

    if (!accountId || !apiToken) {
      console.error('Missing Cloudflare configuration')
      return new Response(
        JSON.stringify({ error: 'Cloudflare configuration missing on server' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // 3. Request Upload URL from Cloudflare
    console.log(`Requesting upload URL for user: ${user.id}`)

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          maxDurationSeconds: 14400, // 4 hours
          expiry: new Date(Date.now() + 3600 * 1000).toISOString(),
          meta: {
            creator_id: user.id,
          }
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Cloudflare API error:', errorData)
      return new Response(
        JSON.stringify({ error: 'Failed to generate upload URL', details: errorData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.status }
      )
    }

    const data = await response.json()
    
    return new Response(
      JSON.stringify(data.result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (err: any) {
    console.error('Unexpected error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', message: err.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
