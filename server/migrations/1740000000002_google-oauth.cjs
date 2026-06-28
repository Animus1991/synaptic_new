/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.createTable(
    'google_oauth_tokens',
    {
      account_id: { type: 'text', primaryKey: true, references: 'accounts', onDelete: 'CASCADE' },
      google_sub: { type: 'text', notNull: true },
      email: { type: 'text', notNull: true },
      access_token: { type: 'text', notNull: true },
      refresh_token: { type: 'text' },
      expires_at: { type: 'timestamptz' },
      scopes: { type: 'text[]', notNull: true, default: '{}' },
      updated_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('NOW()'),
      },
    },
    { ifNotExists: true },
  );

  pgm.createIndex('google_oauth_tokens', 'google_sub', {
    name: 'google_oauth_tokens_google_sub_idx',
    ifNotExists: true,
  });
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('google_oauth_tokens', { ifExists: true });
};
