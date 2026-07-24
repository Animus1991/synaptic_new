/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.sql('CREATE EXTENSION IF NOT EXISTS vector');

  pgm.createTable(
    'library_chunks',
    {
      account_id: { type: 'text', notNull: true },
      chunk_id: { type: 'text', notNull: true },
      file_id: { type: 'text', notNull: true },
      file_name: { type: 'text', notNull: true },
      course_id: { type: 'text' },
      content_hash: { type: 'text', notNull: true },
      text: { type: 'text', notNull: true },
      heading: { type: 'text' },
      page: { type: 'integer' },
      char_start: { type: 'integer', notNull: true, default: 0 },
      char_end: { type: 'integer', notNull: true, default: 0 },
      embedding: { type: 'vector(1536)' },
      tsv: { type: 'tsvector' },
      updated_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('NOW()'),
      },
    },
    { ifNotExists: true },
  );

  pgm.addConstraint('library_chunks', 'library_chunks_pkey', {
    primaryKey: ['account_id', 'chunk_id'],
    ifNotExists: true,
  });

  pgm.createIndex('library_chunks', 'account_id', { ifNotExists: true });
  pgm.createIndex('library_chunks', ['account_id', 'file_id'], { ifNotExists: true });
  pgm.createIndex('library_chunks', 'tsv', {
    method: 'gin',
    ifNotExists: true,
  });
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS library_chunks_embedding_idx
    ON library_chunks
    USING hnsw (embedding vector_cosine_ops)
    WHERE embedding IS NOT NULL
  `);
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('library_chunks', { ifExists: true });
};
