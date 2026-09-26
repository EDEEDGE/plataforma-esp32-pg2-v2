#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/90716676a77cfd5dcb4ec9a88a2cc488eaa87c4ab69fa1d65e6bf6fa7b1d2e73/contract';
import endContract from '../../snapshots/90716676a77cfd5dcb4ec9a88a2cc488eaa87c4ab69fa1d65e6bf6fa7b1d2e73/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/d7a50529640fad86bc715185e6a5f5d729e8142e70e2602b98358d6df563e06e/contract';
import startContract from '../../snapshots/d7a50529640fad86bc715185e6a5f5d729e8142e70e2602b98358d6df563e06e/contract.json' with { type: 'json' };
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
        table: 'device_credentials',
        columns: [
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('credential_hash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('device_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('last_used_at', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('revoked_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'device_pairing_tokens',
        columns: [
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('device_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('expires_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('token_hash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('used_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'devices',
        columns: [
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('created_by_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('device_type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('hardware_id', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('is_active', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('is_paired', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('last_seen_at', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name_key', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('project_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'devices_device_type_check_50569f2c',
            "\"device_type\" IN ('ESP32', 'ESP8266')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'projects',
        columns: [
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('created_by_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('is_active', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name_key', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('room_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'room_invitations',
        columns: [
          col('accepted_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('expires_at', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('invited_by_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('invited_email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('rejected_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('role', 'text', {
            notNull: true,
            default: lit('MEMBER'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('room_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('token_hash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'room_invitations_role_check_50a44636',
            "\"role\" IN ('OWNER', 'ADMIN', 'MEMBER')",
          ),
        ],
      }),
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
          col('name_key', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
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
        table: 'device_credentials',
        constraint: 'device_credentials_credential_hash_key',
        columns: ['credential_hash'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'device_pairing_tokens',
        constraint: 'device_pairing_tokens_token_hash_key',
        columns: ['token_hash'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'devices',
        constraint: 'devices_hardware_id_key',
        columns: ['hardware_id'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'devices',
        constraint: 'devices_project_id_name_key_key',
        columns: ['project_id', 'name_key'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'projects',
        constraint: 'projects_room_id_name_key_key',
        columns: ['room_id', 'name_key'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'room_invitations',
        constraint: 'room_invitations_token_hash_key',
        columns: ['token_hash'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'room_members',
        constraint: 'room_members_room_id_user_id_key',
        columns: ['room_id', 'user_id'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'rooms',
        constraint: 'rooms_owner_id_name_key_key',
        columns: ['owner_id', 'name_key'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'device_credentials',
        index: 'device_credentials_device_id_idx_8f329912',
        columns: ['device_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'device_pairing_tokens',
        index: 'device_pairing_tokens_device_id_idx_8f329912',
        columns: ['device_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'devices',
        index: 'devices_created_by_id_idx_2b1d9a03',
        columns: ['created_by_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'devices',
        index: 'devices_project_id_idx_6ad92603',
        columns: ['project_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'projects',
        index: 'projects_created_by_id_idx_2b1d9a03',
        columns: ['created_by_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'projects',
        index: 'projects_room_id_idx_c32a1e8c',
        columns: ['room_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'room_invitations',
        index: 'room_invitations_invited_by_id_idx_80b34397',
        columns: ['invited_by_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'room_invitations',
        index: 'room_invitations_invited_email_idx_7405cf73',
        columns: ['invited_email'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'room_invitations',
        index: 'room_invitations_room_id_idx_c32a1e8c',
        columns: ['room_id'],
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
        table: 'device_credentials',
        foreignKey: {
          name: 'device_credentials_device_id_fkey',
          columns: ['device_id'],
          references: { schema: 'public', table: 'devices', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'device_pairing_tokens',
        foreignKey: {
          name: 'device_pairing_tokens_device_id_fkey',
          columns: ['device_id'],
          references: { schema: 'public', table: 'devices', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'devices',
        foreignKey: {
          name: 'devices_project_id_fkey',
          columns: ['project_id'],
          references: { schema: 'public', table: 'projects', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'devices',
        foreignKey: {
          name: 'devices_created_by_id_fkey',
          columns: ['created_by_id'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'projects',
        foreignKey: {
          name: 'projects_room_id_fkey',
          columns: ['room_id'],
          references: { schema: 'public', table: 'rooms', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'projects',
        foreignKey: {
          name: 'projects_created_by_id_fkey',
          columns: ['created_by_id'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'room_invitations',
        foreignKey: {
          name: 'room_invitations_room_id_fkey',
          columns: ['room_id'],
          references: { schema: 'public', table: 'rooms', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'room_invitations',
        foreignKey: {
          name: 'room_invitations_invited_by_id_fkey',
          columns: ['invited_by_id'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'cascade',
        },
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
