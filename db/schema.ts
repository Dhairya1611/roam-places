import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

export const users = sqliteTable(
  'users',
  {
    userId: text('user_id').primaryKey(),
    platformEmail: text('platform_email').notNull(),
    googleSub: text('google_sub'),
    googleEmail: text('google_email'),
    displayName: text('display_name'),
    avatarUrl: text('avatar_url'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [uniqueIndex('idx_users_google_sub').on(table.googleSub)],
);

export const interactions = sqliteTable(
  'interactions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id').notNull(),
    eventType: text('event_type').notNull(),
    placeId: text('place_id'),
    placeName: text('place_name'),
    category: text('category'),
    searchQuery: text('search_query'),
    metadata: text('metadata'),
    occurredAt: integer('occurred_at').notNull(),
  },
  (table) => [
    index('idx_interactions_user_time').on(table.userId, table.occurredAt),
    index('idx_interactions_user_category').on(table.userId, table.category),
  ],
);
