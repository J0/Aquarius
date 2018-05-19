# Aquarius Grid Server

Aquarius service area division server

## Development

1. Clone the repo
1. Run `yarn` to install dependencies.

These scripts can then be used:

```bash
$ yarn start # Starts the server, which listens on port 3000
$ yarn watch # Restarts server process when a source file is changed. For use during development
$ yarn lint # Runs ESLint
```

## REST Endpoints

### `/grid/id/:lat/:long`

Returns a grid ID for a client positioned at the provided geographical latitude and longitude.

Example output:

```json
{
   "lat":"37.7757",
   "long":"-122.4180",
   "grid_id":"AQUARIUS GRID 47ffc1c1-5772-44d0-a687-b8c812ef5264"
}
```
