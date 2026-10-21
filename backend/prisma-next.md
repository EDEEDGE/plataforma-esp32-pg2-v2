# Welcome to Prisma Next!

Prisma Next lets you query your database in simple, easy-to-read TypeScript. Define what your data looks like, and Prisma Next gives you a fully typed client — with autocomplete for every table, column, and relation.

This project is set up for PostgreSQL. Prisma Next also supports other databases.

## Requirements

- **PostgreSQL 15 or newer.** Older servers are not supported. Run `SELECT version()` against your server to verify.
- The CLI never connects to your database without explicit consent. Pass `--probe-db` to `npx prisma orm init` if you want `init` to verify the server version itself.

## Your data contract

Your data contract is the heart of your application. It lives at [`src/prisma/contract.prisma`](src/prisma/contract.prisma) and describes your models:

```prisma
model User {
  id       Int     @id @default(autoincrement())
  email    String  @unique
  username String?
  name     String?
}
```

Every model you define in your contract can be queried from your app. Your editor will autocomplete the query methods and show you what type each model field is:

```typescript
import { db } from './src/prisma/db';

const user = await db.orm.public.User
  .where({ email: 'alice@example.com' })
  .first();

// Your editor will show the type of user as
// { id: number; email: string; username: string | null; name: string | null; createdAt: Date; posts: Post[] } | null
```

Your contract has two companion files in the same directory:

- **`contract.json`** — this tells your application what models exist, just like `package-lock.json` tells your package manager what dependencies your project has
- **`contract.d.ts`** — this powers autocomplete and type checking in your editor

Commit both files to git. When you change your contract, run `npx prisma contract emit` to update them.

If you use a framework like Next.js or Vite, the Prisma Next plugin will do this for you automatically.

## Configuration

[`prisma.config.ts`](prisma.config.ts) tells the CLI where your contract lives and how to connect to your database. It loads environment variables from `.env` automatically:

```typescript
import 'dotenv/config';
import { definePrismaConfig } from '@prisma/cli-engine';
import { defineConfig as ormConfig } from '@prisma/orm-postgres/config';

export default definePrismaConfig({
  orm: ormConfig({
    contract: './src/prisma/contract.prisma',
    db: {
      connection: process.env['DATABASE_URL']!,
    },
  }),
});
```

Notice the `DATABASE_URL` above? It's defined in your [`.env`](./.env) file:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
```

You can customize how your environment variables are loaded by changing or removing the `import 'dotenv/config'` line.

## Local PostgreSQL setup

You do not need to export or import a database backup for a new development
database. The current schema is defined in
[`src/prisma/contract.prisma`](src/prisma/contract.prisma).

1. In pgAdmin, connect to your local PostgreSQL 18 server. Create a login role
   named `plataforma_app` with a password you choose, then create a database
   named `plataforma_esp32` owned by that role. Alternatively, run these
   statements separately in Query Tool while connected to the `postgres`
   database as an administrator:

   ```sql
   CREATE ROLE plataforma_app LOGIN PASSWORD 'choose_a_password';
   CREATE DATABASE plataforma_esp32 OWNER plataforma_app ENCODING 'UTF8';
   ```

2. From the `backend` directory, copy `.env.example` to `.env` and replace
   `replace_me` with the role's password. If the password contains URL-reserved
   characters, URL-encode them in `DATABASE_URL`. Keep `.env` local; it is
   ignored by Git.

3. Install the backend dependencies and initialize the empty database with the
   current contract:

   ```powershell
   npm ci
   npx prisma db init
   npx prisma db update --dry-run
   npx prisma db update
   npx prisma db verify
   ```

   Review the dry-run output before applying it. Run `db init` only once, and
   only against this newly created, empty database. `db update` creates the
   tables from the current contract; it does not restore any application data.

4. Start the API:

   ```powershell
   npm run dev
   ```

   Open `http://localhost:3000/`; the API should respond with
   `API OTA funcionando correctamente`.

## Quick reference

### Commands

```bash
npx prisma contract emit       # Update contract.json and contract.d.ts
npx prisma db init             # Initialize an empty development database once
npx prisma db update            # Apply the current contract to the database
npx prisma db verify            # Verify the database matches the contract
```

### Files

| File | Purpose |
|---|---|
| [`src/prisma/contract.prisma`](src/prisma/contract.prisma) | Your data contract — define your models here |
| [`prisma.config.ts`](prisma.config.ts) | CLI configuration |
| [`src/prisma/db.ts`](src/prisma/db.ts) | Database client — `import { db } from './src/prisma/db'` |
| `src/prisma/contract.json` | Compiled contract (generated) |
| `src/prisma/contract.d.ts` | Contract types (generated) |

### Workflow

1. Edit [`src/prisma/contract.prisma`](src/prisma/contract.prisma) to add or change models.
2. Run `npx prisma contract emit` to regenerate the contract.
3. Query your models — your IDE will autocomplete everything.

## Monorepo notes (pnpm workspaces)

If this project lives inside a pnpm workspace, a few things are worth knowing:

- **Catalogs.** When the workspace's `pnpm-workspace.yaml` defines a `catalogs` entry for `prisma` or `@prisma/orm-postgres`, pnpm uses the catalog version everywhere — `init` does too. If you wanted the published `latest` instead, update or remove the catalog entry, then re-run `pnpm install`.
- **`pnpm dlx`.** `pnpm dlx prisma@next orm init …` works in any directory. Inside a workspace, pnpm still resolves dependencies through the workspace's catalog/overrides rather than the registry; expect the installed Prisma Next packages to reflect the workspace's catalog rather than `latest`.
- **`pnpm` → `npm` fallback.** If `pnpm` ever fails to install Prisma Next with a `workspace:*` or `catalog:` resolution error (a leak in a published artefact), `init` falls back to `npm install` and surfaces a warning. Once the offending package republishes a clean version you can switch back with `pnpm install`.
