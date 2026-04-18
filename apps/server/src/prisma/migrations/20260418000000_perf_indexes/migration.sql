-- Like.fromUserId index — "who liked me" and sent-likes queries
CREATE INDEX IF NOT EXISTS "Like_fromUserId_idx" ON "Like"("fromUserId");

-- pgvector ANN index for embedding similarity search
-- Uses ivfflat with cosine distance; lists=100 is good for up to ~1M users
-- Requires pgvector extension (already enabled via CREATE EXTENSION in init migration)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'vector'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS "User_embedding_ivfflat_idx"
             ON "User" USING ivfflat (embedding vector_cosine_ops)
             WITH (lists = 100)';
  END IF;
END $$;
