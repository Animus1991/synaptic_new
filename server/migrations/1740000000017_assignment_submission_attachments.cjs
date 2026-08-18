/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.addColumn(
    'assignment_submissions',
    {
      attachments: {
        type: 'jsonb',
        notNull: true,
        default: pgm.func("'[]'::jsonb"),
      },
    },
    { ifNotExists: true },
  );
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropColumn('assignment_submissions', 'attachments', { ifExists: true });
};
