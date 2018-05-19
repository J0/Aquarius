import program from 'commander';
import IPFS from 'ipfs';

// Print help and exit if no args provided
if (!process.argv.slice(2).length) {
  program.help();
}

program.version('0.0.1');

program.command('driver').action(() => console.log('IMMA DRIVER BUMAMAMA'));

program.command('rider').action(() => console.log('IMMA RIDERUEH BUMAMAMA'));

program.parse(process.argv);

// TODO: Implement client

// TODO: Configure IPFS to choose random port
// TODO: Try to get p2p-circuit working
// TODO: Figure out why only one message gets received

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

  node.swarm
    // .connect('/p2p-circuit/ipfs/QmRzGVxdY7MUAe3UhSXFPPT6T3Fqyas37GbFwUW4CjebZn')
    .connect('/ip4/10.192.122.2/tcp/36049/ipfs/QmRzGVxdY7MUAe3UhSXFPPT6T3Fqyas37GbFwUW4CjebZn')
    .then(() => console.log('Subscribed'));

  node.pubsub
    .subscribe('TOPIC', { discover: true }, (msg) => {
      console.log('Got message', msg.from, msg.data.toString());
    })
    .then(() => console.log('Connected'));
});

setInterval(() => {
  const msg = 'L$RPCGLRCG';
  console.log('Publishing', msg);
  node.pubsub.publish('TOPIC', new Buffer(msg));
}, 4000);

setInterval(() => {
  node.pubsub.peers('TOPIC').then((s) => console.log('Pubsub peers', s));
}, 3000);
