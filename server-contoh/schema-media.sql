-- Opsional: jalankan manual via DBeaver sebagai pemeriksaan struktur.
-- Backend juga melakukan CREATE TABLE otomatis saat dijalankan.
CREATE TABLE IF NOT EXISTS public_media (
  id UUID PRIMARY KEY,
  scope VARCHAR(10) NOT NULL CHECK (scope IN ('gallery','home')),
  title VARCHAR(100) NOT NULL,
  description VARCHAR(200) NOT NULL DEFAULT '',
  file_name VARCHAR(100) NOT NULL,
  width INTEGER NOT NULL CHECK (width > 0),
  height INTEGER NOT NULL CHECK (height > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_public_media_gallery ON public_media(scope, created_at DESC);
