# MEV Watch

This is the official Labrys Repository for [mevwatch.info](https://mevwatch.info)

## Adding Relayers

### TEST THIS ALL AGAINST A LOCAL DB BEFORE DOING IT IN PROD -- WE DON'T HAVE A DEVELOPMENT DB

1. Update the `packages/consts/src/relayers.ts` file to contain the new relay. Follow the existing format
2. If it's a non-censoring relayer, add a section to the FAQ about the validator. Follow the existing format here
3. In the block indexer app run `yarn populate-relayer` to add the relayer to the DB. It might throw an error but it'll work
4. Run the indexing script if you need to to backdate data. 
   1. In the block-indexer app run `yarn populate-block-data`. This will take a while on a fresh DB
   2. If you do this you will also need to backfill the aggregate data.
   3. Drop the `BlockStatsAggregate` model in your DB
   4. Run `yarn populate-aggregate` to repopulate the aggregate model
   5. Check that your graphs all look correct 
 
## What's inside? 

This turborepo uses [Yarn](https://classic.yarnpkg.com/lang/en/) as a package manager. It includes the following packages/apps:

### Apps and Packages

**Apps**

- `client`: a [Next.js](https://nextjs.org) app
- `server`: an [Express]() app

**Packages**

- `database`: package to define the MongoDB database models
- `terraform`: package containing [Terraform]() config which can be used for deployment
- `tsconfig`: `tsconfig.json`s used throughout the monorepo
- `ui`: a stub React component library used by `web` and can be used by any other react projects

Each package/app is 100% [TypeScript](https://www.typescriptlang.org/).

### Utilities

This turborepo has some additional tools already setup for you:

- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting

## Setup

### Build

To build all apps and packages, run the following command:

```
cd my-turborepo
yarn run build
```

### Develop

To develop all apps and packages, run the following command:

```
cd my-turborepo
yarn run dev
```
