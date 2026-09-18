#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/d7a50529640fad86bc715185e6a5f5d729e8142e70e2602b98358d6df563e06e/contract';
import startContract from '../../snapshots/d7a50529640fad86bc715185e6a5f5d729e8142e70e2602b98358d6df563e06e/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/ebf9c3894715b02385ba1638f91184a82c878eddd084337ff200962d57bc6bce/contract';
import endContract from '../../snapshots/ebf9c3894715b02385ba1638f91184a82c878eddd084337ff200962d57bc6bce/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'room_members',
        columns: [
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('role', 'text', {
            notNull: true,
            default: lit('MEMBER'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('room_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('user_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'room_members_role_check_50a44636',
            "\"role\" IN ('OWNER', 'ADMIN', 'MEMBER')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'rooms',
        columns: [
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('is_active', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('owner_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'room_members',
        constraint: 'room_members_room_id_user_id_key',
        columns: ['room_id', 'user_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'room_members',
        index: 'room_members_room_id_idx_c32a1e8c',
        columns: ['room_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'room_members',
        index: 'room_members_user_id_idx_6c952402',
        columns: ['user_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'rooms',
        index: 'rooms_owner_id_idx_ade9f347',
        columns: ['owner_id'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'room_members',
        foreignKey: {
          name: 'room_members_room_id_fkey',
          columns: ['room_id'],
          references: { schema: 'public', table: 'rooms', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'room_members',
        foreignKey: {
          name: 'room_members_user_id_fkey',
          columns: ['user_id'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'rooms',
        foreignKey: {
          name: 'rooms_owner_id_fkey',
          columns: ['owner_id'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
