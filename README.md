# Turborepo starter

This is the official Labrys starter turborepo.

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
