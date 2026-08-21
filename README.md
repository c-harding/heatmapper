# heatmapper

A heatmap of your Strava data, designed for speed of loading.
This is live at https://heatmapper.charding.dev/.
Note that it probably requires a modern browser, and I have not tested it other than with versions of Chrome and Firefox from at least 2020.

[![Demo](https://user-images.githubusercontent.com/8607022/106386528-50cd2800-63cd-11eb-97b5-f2bb59162c35.png)](https://heatmapper.charding.dev/)

Required software for developing: [node](https://nodejs.org/en/download/) and [yarn](https://yarnpkg.com/en/docs/install/).

Recommended: an IDE such as [Visual Studio Code](https://code.visualstudio.com/), [tmux](https://github.com/tmux/tmux/wiki) if you would like to use [`yarn serve`](#yarn-serve), and [Docker](https://www.docker.com/products/docker-desktop) with [Docker Compose](https://docs.docker.com/compose/) for deploying locally.

## Setup

Please complete in full the [`.env`](.env) file, by copying [`sample.env`](sample.env).
When you are ready to deploy, please also complete [`dist/.env`](dist/.env), by copying [`dist/sample.env`](dist/sample.env).

## Worktrees

Several branches can be checked out at once using [git worktrees](https://git-scm.com/docs/git-worktree), each with its own pair of dev servers running side by side.
`yarn worktree` does the setup that git itself does not: allocating ports, sharing the credentials, and sharing server-side sessions.

##### yarn worktree add

Create a worktree under `.worktrees/`, and install its dependencies.

```sh
yarn worktree add my-branch          # .worktrees/my-branch, on the next free ports
yarn worktree add my-branch --serve  # ...and start its dev servers in the background
yarn worktree add my-branch -s -a    # ...and attach to them straight away
```

The argument is a commit-ish, interpreted as `git worktree add` does: a branch is checked out, a
tag or commit is checked out detached, and a name that does not exist yet becomes a new branch off
`HEAD`.
`-b`/`--new-branch` and `-B`/`--reset-branch` take a branch to create at that point, and
`--detach` forces a detached checkout.

```sh
yarn worktree add v1.2.3                  # detached at the tag
yarn worktree add main -b hotfix          # new branch hotfix, starting at main
yarn worktree add main --detach           # detached, rather than on the branch
```

The directory takes its name from the branch or commit, lowercased and with special characters
turned into hyphens, so `fix/localStorage` lands in `.worktrees/fix-localstorage`.
Pass a directory of your own as a second argument: a bare name is another worktree under
`.worktrees/`, while anything with a slash or a leading dot is a path relative to where you are.
The other commands take either spelling, so `yarn worktree remove wip` and
`yarn worktree remove .worktrees/wip` mean the same thing.

Each worktree gets a `.env` holding only its own ports, and inherits everything else from the main checkout — the Strava and Mapbox credentials included — through an `EXTENDS` line:

```sh
# Written by scripts/worktree
EXTENDS=../../.env
SERVER_PORT=8082
VITE_DEV_PORT=8083
SERVER_DOMAIN=http://localhost:8083
SESSIONS_DIR=../../server/sessions
```

There is therefore only ever one copy of the secrets to keep up to date, and because the paths are relative to the checkout rather than named after it, renaming the checkout does not break them.
Ports are handed out in pairs from 8080 upwards, skipping any that another worktree has claimed or that something is already listening on.
Strava always allows `localhost`, whatever callback domain is configured at https://www.strava.com/settings/api, so a new worktree needs nothing set up there.
Mapbox is stricter: if the token has URL restrictions, each new port has to be added to them, since they match the whole origin rather than just the host.

`EXTENDS` is understood only by [`shared/config/dotenv.js`](shared/config/dotenv.js).
The deploy files in `dist/` are also read by bash and by Docker Compose, neither of which knows about it, so they are not layered that way.
Instead a worktree simply has none, and [`scripts/get-env`](scripts/get-env) falls back to the main checkout's, so `yarn deploy` and `yarn connect` work from a worktree.
`yarn container` is the exception: it builds the image from the worktree's own `dist/`, and [`dist/Dockerfile`](dist/Dockerfile) bakes the env file into the image, so run it from the main checkout or give the worktree its own `dist/<env>.env`.
Either way, a worktree's own `dist/<env>.env` takes precedence over the main checkout's.

##### yarn worktree bootstrap

Do that same setup for a worktree that already exists, such as one created with plain `git worktree add`.
It is safe to re-run, and does nothing if the worktree is already set up; pass `--force` to rewrite its `.env` and reallocate its ports.

##### yarn worktree serve, list and remove

- `serve` starts a worktree's dev servers in the background, or with `--attach` brings them to the foreground — attaching to servers that are already running rather than restarting them.
- `list` shows every worktree with its ports and whether its servers are up.
- `remove` stops the servers and deletes the worktree, refusing if anything would be lost — uncommitted changes, or untracked files that are not ignored — unless given `--force`; the branch itself is left alone.

Every command takes `--help`, and `yarn worktree help <command>` does the same.

##### Sharing a login between worktrees

`SESSIONS_DIR` points each worktree at the main checkout's `server/sessions`, so you log in to Strava once and stay logged in everywhere.
That works across ports because the session token is a cookie, and cookies are scoped by host with no regard for the port.

In-browser caches are not shared.

## Scripts for running

### Development

#### Scripts to be run at the root

The following scripts are located at the root of the monorepo, and apply changes to both the frontend and backend.

##### yarn install-all

Install all dependencies needed for developing and running the code locally.

##### yarn serve

Run both servers together, using `tmux`.
Ctrl-C in either one will kill both.

Pass `--no-attach` to leave them running in the background instead of attaching.

See [`yarn serve`](#yarn-serve-1) below for more information about how these servers work.

To leave this running in the background, the default shortcut to detach from a tmux session is <kbd>^b</kbd> <kbd>d</kbd>.
It can then be reentered with `tmux attach`.

#### Scripts to be run inside each project

The following scripts can be run in either the frontend or the backend projects.

##### `yarn`

Install packages for this one project.

##### `yarn serve`

Run a development server for this project.
Note that the backend dev server will forward frontend requests to the latest local build of the frontend, and the frontend dev server will forward backend requests to the running backend server (on port 8080).

As this is a development server, the frontend will automatically recompile and reload on save.
The browser’s dev tools will allow for Vue to be inspected, unlike when it is build for production.

##### `yarn lint`

Front

### Building and serving for production

The server can be built to run in Docker using Docker Compose.

#### `yarn build`

This will build both the frontend and backend, and place them together in the `dist/` folder.
This is equivalent to running `yarn build` in both projects.

#### `yarn container`

Run the compiled Docker instance.
This will not reload the code; add the `--build` flag to do so, or see [`yarn build-container`](#yarn-build-container).
Add the `-d` flag to run in the background.

Run `docker-compose down -v` to stop the container permanently.

#### `yarn build-container`

Run `yarn build` followed by `yarn container --build`, so recompiling both the frontend and backend, and updating and rerunning the container.

Note that if the container was previously left running with `-d`, this will leave it running until it has been rebuilt, to minimise the downtime.

#### `yarn deploy`

Deploy the container to a remote server, and (re)start it.
This will use the configuration in [`dist/.env`](dist/.env) (see [`dist/sample.env`](dist/sample.env)).

#### `yarn build-deploy`

Run `yarn build` followed by `yarn deploy`, so recompiling both the frontend and backend, and updating and rerunning the container on the server.

#### `yarn connect`

Log in to your remote server.
If this fails, then `yarn deploy` will also likely fail, so it is useful for testing.
