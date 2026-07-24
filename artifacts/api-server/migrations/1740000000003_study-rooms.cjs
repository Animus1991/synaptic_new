/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.createTable(
    'study_rooms',
    {
      id: { type: 'uuid', primaryKey: true },
      course_id: { type: 'text', notNull: true },
      name: { type: 'text', notNull: true },
      invite_code: { type: 'text', notNull: true, unique: true },
      jitsi_room: { type: 'text', notNull: true },
      shared_tool: { type: 'text' },
      shared_concept: { type: 'text' },
      whiteboard_version: { type: 'integer', notNull: true, default: 0 },
      created_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('NOW()'),
      },
    },
    { ifNotExists: true },
  );

  pgm.createIndex('study_rooms', 'course_id', {
    name: 'study_rooms_course_id_idx',
    ifNotExists: true,
  });
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('study_rooms', { ifExists: true });
};
