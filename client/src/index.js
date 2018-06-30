import program from 'commander';
import IPFS from 'ipfs';
import fetch from 'node-fetch';
import { GRID_SERVER_URL } from '../config';
import Driver from './driver';
import Rider from './rider';
import Chatroom from './chatroom';
import repl from './repl';

// Print help and exit if no args provided
if (!process.argv.slice(2).length) {
  program.help();
}

let isDriver;

program.version('0.0.1');

program.command('driver').action(() => {
  isDriver = true;
  console.log('IMMA DRIVER BUMAMAMA');
});

program.command('rider').action(() => {
  isDriver = false;
  console.log('IMMA RIDERUE BUMAMAMA');
});

program.parse(process.argv);

// Exit if neither a driver or a rider
if (isDriver === undefined) {
  program.help();
}

// TODO: Implement client

// TODO: Configure IPFS to choose random port
// TODO: Try to get p2p-circuit working

const node = new IPFS({
  EXPERIMENTAL: {
    pubsub: true,
    relay: {
      enabled: true,
      hop: { enabled: true, active: false },
    },
  },
});

const nodeReadyPromise = new Promise((resolve) => {
  node.once('ready', () => resolve());
});

const gridIDPromise = fetch(`${GRID_SERVER_URL}/grid/id/0/0`).then((res) => res.json());

Promise.all([nodeReadyPromise, gridIDPromise])
  .then(([ready, gridData]) => {
    console.log('IPFS+GRID READY', ready, gridData, isDriver);
    const chatroom = new Chatroom(gridData.grid_id, node.pubsub);
    const party = isDriver ? new Driver(chatroom) : new Rider(chatroom);
    return party;
  })
  .then(repl);

// node.once('ready', () => {
// console.log('READY');

// let party;

// console.log(program.args, program.rider);
// const chatroom = new Chatroom('TOPIC', node.pubsub);

// setInterval(() => {
// const msg = party ? party.derp() : 'LORECIG';
// console.log('Publishing', msg);
// chatroom.send(msg);
// }, 4000);
// });

// setInterval(() => {
// node.pubsub.peers('TOPIC').then((s) => console.log('Pubsub peers', s));
// }, 3000);
