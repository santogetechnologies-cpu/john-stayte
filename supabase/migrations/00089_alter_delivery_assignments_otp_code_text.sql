-- Migration 00089: Alter delivery_assignments.otp_code column to TEXT
-- Allows storing cryptographically salted SHA-256 hashes (sha256:<salt>:<hash>)
-- without truncation errors while preserving backward compatibility for plaintext codes.

ALTER TABLE public.delivery_assignments 
  ALTER COLUMN otp_code TYPE TEXT;
