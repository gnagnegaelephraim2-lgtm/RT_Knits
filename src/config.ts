// ============================================================
// RT KNITS — NITA CMMS Configuration Module
// ============================================================

import type { NitaConfig } from './types';

export const NITA_CONFIG: NitaConfig = {
  USE_REAL_SUPABASE: true,
  SUPABASE_URL: "https://zemhcqrnlfikvtgknqjp.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplbWhjcXJubGZpa3Z0Z2tucWpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1MDUwNTgsImV4cCI6MjA5OTA4MTA1OH0.lRoJrxLaHehKetF4vaTkc8n67pVHbVRm38zBCikquvk",
  NITA_API_URL: "https://bot.nelsonfodjo.me/webhook",
  NITA_WHATSAPP: "+15551564344"
};

// Expose globally for backward compatibility with inline onclick handlers
declare global {
  interface Window {
    NITA_CONFIG: NitaConfig;
  }
}
window.NITA_CONFIG = NITA_CONFIG;
