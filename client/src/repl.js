import repl from 'repl';
import program from 'commander';

export default function startRepl(party) {
  party.registerCommands(program);

  function myEval(cmd, context, filename, callback) {
    // Insert 2 empty strings to mimic process.argv
    const argv = ['', '', ...cmd.trim().split(' ')];
    program.parse(argv);
    callback(null);
  }

  repl.start({ prompt: '> ', eval: myEval });
}
