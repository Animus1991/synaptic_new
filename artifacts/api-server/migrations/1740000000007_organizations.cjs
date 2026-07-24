/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.createTable(
    'organizations',
    {
      id: { type: 'text', primaryKey: true },
      name: { type: 'text', notNull: true },
      created_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('NOW()'),
      },
    },
    { ifNotExists: true },
  );

  pgm.createTable(
    'org_memberships',
    {
      id: { type: 'text', primaryKey: true },
      org_id: {
        type: 'text',
        notNull: true,
        references: 'organizations',
        onDelete: 'CASCADE',
      },
      account_id: { type: 'text', notNull: true },
      role: { type: 'text', notNull: true },
      created_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('NOW()'),
      },
    },
    { ifNotExists: true },
  );

  pgm.createIndex('org_memberships', 'org_id', {
    name: 'org_memberships_org_id_idx',
    ifNotExists: true,
  });

  pgm.createIndex('org_memberships', 'account_id', {
    name: 'org_memberships_account_id_idx',
    ifNotExists: true,
  });

  pgm.addConstraint('org_memberships', 'org_memberships_org_account_uniq', {
    unique: ['org_id', 'account_id'],
    ifNotExists: true,
  });

  pgm.addColumns(
    'teacher_classes',
    {
      org_id: {
        type: 'text',
        references: 'organizations',
        onDelete: 'SET NULL',
      },
    },
    { ifNotExists: true },
  );

  pgm.createIndex('teacher_classes', 'org_id', {
    name: 'teacher_classes_org_id_idx',
    ifNotExists: true,
  });
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropIndex('teacher_classes', 'org_id', { name: 'teacher_classes_org_id_idx', ifExists: true });
  pgm.dropColumns('teacher_classes', ['org_id'], { ifExists: true });
  pgm.dropTable('org_memberships', { ifExists: true });
  pgm.dropTable('organizations', { ifExists: true });
};
