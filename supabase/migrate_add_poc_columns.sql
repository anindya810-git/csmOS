-- ============================================================
-- Migration: Add POC (Point of Contact) columns to accounts
-- Run this in Supabase SQL Editor if your accounts table already exists
-- ============================================================

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS poc1_name        TEXT,
  ADD COLUMN IF NOT EXISTS poc1_email       TEXT,
  ADD COLUMN IF NOT EXISTS poc1_phone       TEXT,
  ADD COLUMN IF NOT EXISTS poc1_designation TEXT,
  ADD COLUMN IF NOT EXISTS poc2_name        TEXT,
  ADD COLUMN IF NOT EXISTS poc2_email       TEXT,
  ADD COLUMN IF NOT EXISTS poc2_phone       TEXT,
  ADD COLUMN IF NOT EXISTS poc2_designation TEXT,
  ADD COLUMN IF NOT EXISTS poc3_name        TEXT,
  ADD COLUMN IF NOT EXISTS poc3_email       TEXT,
  ADD COLUMN IF NOT EXISTS poc3_phone       TEXT,
  ADD COLUMN IF NOT EXISTS poc3_designation TEXT;
