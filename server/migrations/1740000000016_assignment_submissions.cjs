/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.createTable(
    'assignment_submissions',
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
      enrollment_id: {
        type: 'text',
        notNull: true,
        references: 'class_enrollments',
        onDelete: 'CASCADE',
      },
      account_id: { type: 'text', notNull: true },
      body: { type: 'text', notNull: true, default: '' },
      link_url: { type: 'text' },
      submitted_at: {
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

  pgm.addConstraint('assignment_submissions', 'assignment_submissions_enrollment_assignment_uniq', {
    unique: ['class_id', 'assignment_id', 'enrollment_id'],
    ifNotExists: true,
  });

  pgm.createIndex('assignment_submissions', ['class_id', 'enrollment_id'], {
    name: 'assignment_submissions_class_enrollment_idx',
    ifNotExists: true,
  });

  pgm.createIndex('assignment_submissions', ['class_id', 'assignment_id'], {
    name: 'assignment_submissions_class_assignment_idx',
    ifNotExists: true,
  });
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('assignment_submissions', { ifExists: true });
};
