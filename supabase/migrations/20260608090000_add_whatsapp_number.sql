-- Migration: Add whatsapp_number to session_packs
ALTER TABLE public.session_packs ADD COLUMN IF NOT EXISTS whatsapp_number text;
