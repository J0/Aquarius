import program from 'commander';
import fetch from 'node-fetch';
import { GRID_SERVER_URL } from '../config';

import Driver from './driver';
import Rider from './rider';
import ipfs from './ipfsWrapper';

import repl from './repl';

// Print help and exit if no args provided
if (!process.argv.slice(2).length) {
  program.help();
}

let isDriver;

program.version('0.0.1').option('-b, --boundary <f>', 'Upper/lower price boundary', parseFloat);

program.command('driver').action(() => {
  isDriver = true;
  console.log("I'm a driver");
});

program.command('rider').action(() => {
  isDriver = false;
  console.log("I'm a rider");
});

program.parse(process.argv);

// Exit if neither a driver or a rider
if (isDriver === undefined) {
  program.help();
}

// TODO: Use actual location
const gridIDPromise = fetch(`${GRID_SERVER_URL}/grid/id/0/0`).then((res) => res.json());

Promise.all([ipfs.setup(), gridIDPromise])
  .then(([ipfs, gridData]) => {
    const { boundary } = program;
    console.log('IPFS+GRID READY', ipfs.identity.id, gridData, isDriver, boundary);
    const chatroom = ipfs.createChatroom(gridData.grid_id);
    const party = isDriver ? new Driver(chatroom, boundary) : new Rider(chatroom, boundary);
    return party;
  })
  .then(repl);
