import Party from './party';

const PING_INTERVAL = 3000;
export default class Rider extends Party {
  wantDrivers = false;

  derp() {
    return "I'm a Rhider";
  }

  registerCommands(program) {
    super.registerCommands(program);

    program.command('ride').action(() => {
      console.log('Looking for drivers');
      this.wantDrivers = true;
      if (!this.pingTimer) {
        this.pingTimer = setInterval(() => {
          this.gridChatroom.send({ start: 'LOC1', end: 'LOC2' });
        }, PING_INTERVAL);
      }
    });

    program.command('cancel').action(() => {
      console.log('Stopped looking for driders');
      this.wantDrivers = false;
      this.pingTimer && clearInterval(this.pingTimer);
      this.pingTimer = null;
    });
  }
}
