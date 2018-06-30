import program from 'commander';
import IPFS from 'ipfs';
import fetch from 'node-fetch';
import { GRID_SERVER_URL } from '../config';
import Driver from './driver';
import Rider from './rider';

// Print help and exit if no args provided
if (!process.argv.slice(2).length) {
  program.help();
}

let party;

program.version('0.0.1');

program.command('driver').action(() => {
  party = new Driver();
  console.log('IMMA DRIVER BUMAMAMA');
});

program.command('rider').action(() => {
  party = new Rider();
  console.log('IMMA RIDERUE BUMAMAMA');
});

program.parse(process.argv);

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

node.once('ready', () => {
  console.log('READY');

  node.pubsub
    .subscribe(
      'TOPIC',
      (msg) => {
        console.log('Got message', msg.from, msg.data.toString());
      },
      { discover: true },
    )
    .then(() => console.log('Connected'));
});

setInterval(() => {
  const msg = party ? party.derp() : 'LORECIG';
  console.log('Publishing', msg);
  node.pubsub.publish('TOPIC', Buffer.from(msg));
}, 4000);

// setInterval(() => {
// node.pubsub.peers('TOPIC').then((s) => console.log('Pubsub peers', s));
// }, 3000);

fetch(`${GRID_SERVER_URL}/grid/id/2/2`)
  .then((res) => res.json())
  .then((data) => {
    console.log('LRK', data);
  });
