/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.createTable(
    'assignment_discussion_posts',
    {
      id: { type: 'text', primaryKey: true },
      class_id: {
        type: 'text',
        notNull: true,
        references: 'teacher_classes',
        onDelete: 'CASCADE',
      },
      assignment_id: {
        type: 'text',
        notNull: true,
        references: 'class_assignments',
        onDelete: 'CASCADE',
      },
      author_account_id: { type: 'text', notNull: true },
      author_role: { type: 'text', notNull: true },
      body: { type: 'text', notNull: true },
      created_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('NOW()'),
      },
    },
    { ifNotExists: true },
  );

  pgm.createIndex('assignment_discussion_posts', ['class_id', 'assignment_id'], {
    name: 'assignment_discussion_posts_class_assignment_idx',
    ifNotExists: true,
  });
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('assignment_discussion_posts', { ifExists: true });
};
