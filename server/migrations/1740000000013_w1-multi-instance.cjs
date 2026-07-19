/** W1 — email verification + MCP OAuth persistence for multi-instance.
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.addColumns(
    'accounts',
    {
      email_verified: {
        type: 'boolean',
        notNull: true,
        default: false,
      },
      email_verified_at: {
        type: 'timestamptz',
      },
    },
    { ifNotExists: true },
  );

  // Existing accounts remain usable; new registrations start unverified.
  pgm.sql('UPDATE accounts SET email_verified = true, email_verified_at = COALESCE(email_verified_at, NOW()) WHERE email_verified = false');

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

  pgm.createTable(
    'mcp_oauth_auth_codes',
    {
      code_hash: { type: 'text', primaryKey: true },
      client_id: { type: 'text', notNull: true },
      account_id: { type: 'text', notNull: true },
      redirect_uri: { type: 'text', notNull: true },
      code_challenge: { type: 'text', notNull: true },
      code_challenge_method: { type: 'text', notNull: true, default: 'S256' },
      scope: { type: 'text', notNull: true, default: '' },
      expires_at: { type: 'timestamptz', notNull: true },
      created_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('NOW()'),
      },
    },
    { ifNotExists: true },
  );

  pgm.createIndex('mcp_oauth_auth_codes', 'expires_at', {
    name: 'mcp_oauth_auth_codes_expires_at_idx',
    ifNotExists: true,
  });
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('mcp_oauth_auth_codes', { ifExists: true, cascade: true });
  pgm.dropTable('mcp_oauth_clients', { ifExists: true, cascade: true });
  pgm.dropColumns('accounts', ['email_verified', 'email_verified_at'], { ifExists: true });
};
