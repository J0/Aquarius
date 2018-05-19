# Aquarius Client

Aquarius CLI driver/server client

## Development

The client currently does not work on Node 10 due to some incompatibilities in the Leveldown subdependency. Please use Node 9 instead.

1. Clone the repo
1. Run `yarn` to install dependencies.

### Usage

```bash
$ yarn start # Runs the client.
$ yarn watch # Restarts the client when a source file is changed.
$ yarn lint # Runs ESLint
```

To view commands accepted by the client, simply run `yarn start` or `yarn start -h`. Both the `yarn start` and `yarn watch` scripts pass arguments through to the client script. The client currently doesn't do much, but here is how you would pass arguments to it:

```bash
$ yarn start --version
...
0.0.1
...
```
