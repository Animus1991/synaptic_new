/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.createTable(
    'teacher_classes',
    {
      id: { type: 'text', primaryKey: true },
      teacher_account_id: { type: 'text', notNull: true },
      name: { type: 'text', notNull: true },
      course_id: { type: 'text' },
      created_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('NOW()'),
      },
    },
    { ifNotExists: true },
  );

  pgm.createIndex('teacher_classes', 'teacher_account_id', {
    name: 'teacher_classes_teacher_account_id_idx',
    ifNotExists: true,
  });

  pgm.createTable(
    'class_enrollments',
    {
      id: { type: 'text', primaryKey: true },
      class_id: {
        type: 'text',
        notNull: true,
        references: 'teacher_classes',
        onDelete: 'CASCADE',
      },
      student_email: { type: 'text', notNull: true },
      display_name: { type: 'text' },
      mastery: { type: 'real' },
      last_active: { type: 'timestamptz' },
      enrolled_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('NOW()'),
      },
    },
    { ifNotExists: true },
  );

  pgm.createIndex('class_enrollments', 'class_id', {
    name: 'class_enrollments_class_id_idx',
    ifNotExists: true,
  });

  pgm.createIndex('class_enrollments', ['class_id', 'student_email'], {
    name: 'class_enrollments_class_email_uniq',
    unique: true,
    ifNotExists: true,
  });

  pgm.createTable(
    'class_assignments',
    {
      id: { type: 'text', primaryKey: true },
      class_id: {
        type: 'text',
        notNull: true,
        references: 'teacher_classes',
        onDelete: 'CASCADE',
      },
      title: { type: 'text', notNull: true },
      description: { type: 'text' },
      due_at: { type: 'text' },
      course_id: { type: 'text' },
      created_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('NOW()'),
      },
    },
    { ifNotExists: true },
  );

  pgm.createIndex('class_assignments', 'class_id', {
    name: 'class_assignments_class_id_idx',
    ifNotExists: true,
  });

  pgm.createTable(
    'gradebook_cells',
    {
      class_id: {
        type: 'text',
        notNull: true,
        references: 'teacher_classes',
        onDelete: 'CASCADE',
      },
      enrollment_id: {
        type: 'text',
        notNull: true,
        references: 'class_enrollments',
        onDelete: 'CASCADE',
      },
      assignment_id: {
        type: 'text',
        notNull: true,
        references: 'class_assignments',
        onDelete: 'CASCADE',
      },
      status: { type: 'text', notNull: true },
      score: { type: 'integer' },
      updated_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('NOW()'),
      },
    },
    { ifNotExists: true },
  );

  pgm.addConstraint('gradebook_cells', 'gradebook_cells_pkey', {
    primaryKey: ['class_id', 'enrollment_id', 'assignment_id'],
    ifNotExists: true,
  });
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('gradebook_cells', { ifExists: true });
  pgm.dropTable('class_assignments', { ifExists: true });
  pgm.dropTable('class_enrollments', { ifExists: true });
  pgm.dropTable('teacher_classes', { ifExists: true });
};
