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

  const r = repl.start({ prompt: '> ', eval: myEval });
  // setInterval(() => {
  // const msg = party ? party.derp() : 'LORECIG';
  // console.log('Publishing', msg);
  // chatroom.send(msg);
  // }, 4000);
}
