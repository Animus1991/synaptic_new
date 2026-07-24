/** W2 — durable LTI AGS line items + passback log (OPS-07).
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.createTable(
    'lti_line_items',
    {
      class_id: { type: 'text', notNull: true },
      assignment_id: { type: 'text', notNull: true },
      line_item_url: { type: 'text', notNull: true },
      resource_link_id: { type: 'text' },
      updated_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('NOW()'),
      },
    },
    { ifNotExists: true },
  );

  pgm.addConstraint('lti_line_items', 'lti_line_items_pkey', {
    primaryKey: ['class_id', 'assignment_id'],
    ifNotExists: true,
  });

  pgm.createIndex('lti_line_items', 'class_id', {
    name: 'lti_line_items_class_id_idx',
    ifNotExists: true,
  });

  pgm.createTable(
    'lti_passback_log',
    {
      id: { type: 'text', primaryKey: true },
      class_id: { type: 'text', notNull: true },
      assignment_id: { type: 'text', notNull: true },
      enrollment_id: { type: 'text', notNull: true },
      lti_user_id: { type: 'text', notNull: true },
      line_item_url: { type: 'text' },
      payload: { type: 'jsonb', notNull: true },
      status: { type: 'text', notNull: true },
      platform_status: { type: 'integer' },
      platform_body: { type: 'text' },
      attempt_count: { type: 'integer', notNull: true, default: 1 },
      created_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('NOW()'),
      },
      updated_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('NOW()'),
      },
    },
    { ifNotExists: true },
  );

  pgm.createIndex('lti_passback_log', ['class_id', 'created_at'], {
    name: 'lti_passback_log_class_created_idx',
    ifNotExists: true,
  });

  pgm.createIndex('lti_passback_log', 'status', {
    name: 'lti_passback_log_status_idx',
    ifNotExists: true,
  });
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('lti_passback_log', { ifExists: true });
  pgm.dropTable('lti_line_items', { ifExists: true });
};
