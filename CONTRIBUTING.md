# Contributing

Contributions are welcome. For larger changes, open an issue first so the scope can be discussed before implementation.

## Development setup

Install the dependencies and start the local app:

```sh
pnpm install
pnpm dev
```

Before opening a pull request, run:

```sh
pnpm typecheck
pnpm build
```

## Database changes

Add schema changes as a new, numbered SQL migration in `migrations/`. Do not edit a migration that has already been applied to a deployed database.

## Pull requests

Describe the user-visible change and include the commands used to verify it. Keep changes focused and update the README when setup or deployment instructions change.
