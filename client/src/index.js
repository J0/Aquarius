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

const node = new IPFS({ EXPERIMENTAL: { pubsub: true } });

node.once('ready', () => {
  // console.log('READY', node, node.pubsub);
  node.pubsub.subscribe(
    'hello',
    { discover: true },
    (msg) => console.log('Got message', msg.from, msg.data.toString()),
    (err) => {
      if (err) console.error('Failed to subscribe with error', err);
      else console.log('Subscribed');
      node.pubsub.publish('hello', new Buffer('ONEYTHSEONTIHSOEIHSNTEOIHSNOEHISNOETIH'));
    },
  );
});
