-- ============================================================
-- Migration 018: Drop existing Preview Guest AI history
-- ============================================================
-- "Preview Guest" is the public demo login surfaced on the invite
-- screen ("Try the demo"). Anyone curious can sign in under that
-- identity, so persisting their AI questions would leak prior demo
-- users' Q&As into the History view of every subsequent visitor.
--
-- The edge function and client are being updated in the same change
-- to skip persistence and history reads for that name. This migration
-- wipes anything that was already logged before the gate landed.
-- Safe to re-run.
-- ============================================================

delete from public.ai_questions where guest_name = 'Preview Guest';
