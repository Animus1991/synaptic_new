/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.createTable(
    'library_thumbnails',
    {
      account_id: { type: 'text', notNull: true },
      file_id: { type: 'text', notNull: true },
      content_type: { type: 'text', notNull: true },
      width: { type: 'integer', notNull: true },
      height: { type: 'integer', notNull: true },
      page_index: { type: 'integer', notNull: true, default: 0 },
      etag: { type: 'text', notNull: true },
      bytes: { type: 'bytea', notNull: true },
      updated_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('NOW()'),
      },
    },
    { ifNotExists: true },
  );

  pgm.addConstraint('library_thumbnails', 'library_thumbnails_pkey', {
    primaryKey: ['account_id', 'file_id'],
    ifNotExists: true,
  });

  pgm.createIndex('library_thumbnails', 'account_id', { ifNotExists: true });
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('library_thumbnails', { ifExists: true });
};
