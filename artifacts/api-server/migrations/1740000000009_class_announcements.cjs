/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.createTable(
    'class_announcements',
    {
      id: { type: 'text', primaryKey: true },
      class_id: {
        type: 'text',
        notNull: true,
        references: 'teacher_classes',
        onDelete: 'CASCADE',
      },
      author_account_id: { type: 'text', notNull: true },
      title: { type: 'text', notNull: true },
      body: { type: 'text', notNull: true },
      created_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('NOW()'),
      },
    },
    { ifNotExists: true },
  );

  pgm.createIndex('class_announcements', 'class_id', {
    name: 'class_announcements_class_id_idx',
    ifNotExists: true,
  });
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('class_announcements', { ifExists: true });
};
