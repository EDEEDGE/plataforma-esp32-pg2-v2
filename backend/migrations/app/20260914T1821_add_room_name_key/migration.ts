#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/eb9e1a3a24f5e240918af8a37f9c8af28f82d52a8330b8fad411048d2d6828c4/contract';
import endContract from '../../snapshots/eb9e1a3a24f5e240918af8a37f9c8af28f82d52a8330b8fad411048d2d6828c4/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/ebf9c3894715b02385ba1638f91184a82c878eddd084337ff200962d57bc6bce/contract';
import startContract from '../../snapshots/ebf9c3894715b02385ba1638f91184a82c878eddd084337ff200962d57bc6bce/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'rooms',
        column: col('name_key', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
