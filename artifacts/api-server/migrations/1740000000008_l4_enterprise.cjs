/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.createTable(
    'audit_logs',
    {
      id: { type: 'text', primaryKey: true },
      org_id: { type: 'text', references: 'organizations', onDelete: 'SET NULL' },
      account_id: { type: 'text' },
      action: { type: 'text', notNull: true },
      resource: { type: 'text' },
      metadata: { type: 'jsonb', notNull: true, default: '{}' },
      ip: { type: 'text' },
      created_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('NOW()'),
      },
    },
    { ifNotExists: true },
  );

  pgm.createIndex('audit_logs', 'org_id', { name: 'audit_logs_org_id_idx', ifNotExists: true });
  pgm.createIndex('audit_logs', 'account_id', { name: 'audit_logs_account_id_idx', ifNotExists: true });
  pgm.createIndex('audit_logs', 'created_at', { name: 'audit_logs_created_at_idx', ifNotExists: true });

  pgm.createTable(
    'lti_deployments',
    {
      id: { type: 'text', primaryKey: true },
      org_id: {
        type: 'text',
        notNull: true,
        references: 'organizations',
        onDelete: 'CASCADE',
      },
      deployment_id: { type: 'text', notNull: true },
      platform_issuer: { type: 'text', notNull: true },
      client_id: { type: 'text', notNull: true },
      platform_auth_url: { type: 'text' },
      platform_jwks_url: { type: 'text' },
      created_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('NOW()'),
      },
    },
    { ifNotExists: true },
  );

  pgm.createIndex('lti_deployments', 'org_id', { name: 'lti_deployments_org_id_idx', ifNotExists: true });
  pgm.addConstraint('lti_deployments', 'lti_deployments_org_deployment_uniq', {
    unique: ['org_id', 'deployment_id'],
    ifNotExists: true,
  });

  pgm.createTable(
    'transcribe_jobs',
    {
      id: { type: 'text', primaryKey: true },
      account_id: { type: 'text', notNull: true },
      status: { type: 'text', notNull: true },
      language: { type: 'text' },
      filename: { type: 'text' },
      result_text: { type: 'text' },
      error: { type: 'text' },
      created_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('NOW()'),
      },
      completed_at: { type: 'timestamptz' },
    },
    { ifNotExists: true },
  );

  pgm.createIndex('transcribe_jobs', 'account_id', {
    name: 'transcribe_jobs_account_id_idx',
    ifNotExists: true,
  });
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('transcribe_jobs', { ifExists: true });
  pgm.dropTable('lti_deployments', { ifExists: true });
  pgm.dropTable('audit_logs', { ifExists: true });
};
