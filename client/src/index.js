import program from 'commander';

// Print help and exit if no args provided
if (!process.argv.slice(2).length) {
  program.help();
}

program.version('0.0.1');

program.parse(process.argv);

// TODO: Implement client
