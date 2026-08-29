#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/4df419b43abc85dce7839abd17459702d53239c075026e3842f843609ec6a7cc/contract';
import startContract from '../../snapshots/4df419b43abc85dce7839abd17459702d53239c075026e3842f843609ec6a7cc/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/9d8d76f0297bef4e6f1fd643d548393934a60e8535e44e06cdc05d4e4af2fc29/contract';
import endContract from '../../snapshots/9d8d76f0297bef4e6f1fd643d548393934a60e8535e44e06cdc05d4e4af2fc29/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'users',
        column: col('token_version', 'int4', {
          notNull: true,
          default: lit(0),
          codecRef: { codecId: 'pg/int4@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
