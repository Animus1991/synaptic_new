/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.addColumn(
    'assignment_discussion_posts',
    {
      parent_post_id: {
        type: 'text',
        references: 'assignment_discussion_posts',
        onDelete: 'CASCADE',
      },
    },
    { ifNotExists: true },
  );

  pgm.createIndex('assignment_discussion_posts', ['parent_post_id'], {
    name: 'assignment_discussion_posts_parent_idx',
    ifNotExists: true,
  });
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropIndex('assignment_discussion_posts', ['parent_post_id'], {
    name: 'assignment_discussion_posts_parent_idx',
    ifExists: true,
  });
  pgm.dropColumn('assignment_discussion_posts', 'parent_post_id', { ifExists: true });
};
