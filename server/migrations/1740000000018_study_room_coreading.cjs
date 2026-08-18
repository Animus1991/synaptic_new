/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.createTable(
    'study_room_coreading',
    {
      room_id: {
        type: 'text',
        primaryKey: true,
        references: 'study_rooms',
        onDelete: 'CASCADE',
      },
      payload: { type: 'jsonb', notNull: true, default: pgm.func("'{\"roomId\":\"\",\"challenges\":[]}'::jsonb") },
      updated_at: {
        type: 'timestamptz',
        notNull: true,
        default: pgm.func('NOW()'),
      },
    },
    { ifNotExists: true },
  );
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('study_room_coreading', { ifExists: true });
};
