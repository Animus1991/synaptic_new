/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.createTable(
    'mcp_oauth_clients',
    {
      client_id: { type: 'text', primaryKey: true },
      redirect_uris: { type: 'jsonb', notNull: true },
      client_name: { type: 'text' },
      scope: { type: 'text' },
      token_endpoint_auth_method: { type: 'text', notNull: true, default: 'none' },
      created_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('NOW()'),
      },
    },
    { ifNotExists: true },
  );
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('mcp_oauth_clients', { ifExists: true });
};
