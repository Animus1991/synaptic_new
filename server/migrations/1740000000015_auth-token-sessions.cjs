/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.addColumns(
    'auth_tokens',
    {
      id: { type: 'text' },
      user_agent: { type: 'text' },
      ip: { type: 'text' },
    },
    { ifNotExists: true },
  );

  pgm.sql(`
    UPDATE auth_tokens
    SET id = md5(token_hash || kind || COALESCE(created_at::text, ''))
    WHERE id IS NULL
  `);

  pgm.sql(`
    ALTER TABLE auth_tokens
    ALTER COLUMN id SET NOT NULL
  `);

  pgm.createIndex('auth_tokens', 'id', {
    name: 'auth_tokens_id_uidx',
    unique: true,
    ifNotExists: true,
  });
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropIndex('auth_tokens', 'id', { name: 'auth_tokens_id_uidx', ifExists: true });
  pgm.dropColumns('auth_tokens', ['id', 'user_agent', 'ip'], { ifExists: true });
};
