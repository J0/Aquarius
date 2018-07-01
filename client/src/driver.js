import Party from './party';

export default class Driver extends Party {
  wantRiders = false;

  constructor(gridChatroom) {
    super(gridChatroom);
  }

  derp() {
    return "I'm a dRIER";
  }

  onMainChatroomMessage(msg, riderAddr) {
    console.log('On driver msg', msg, this.wantRiders);

    if (this.wantRiders) {
      // TODO: negotiate
      console.log('Start negotiating with', msg, riderAddr);
    }
  }

  registerCommands(program) {
    super.registerCommands(program);

    program.command('startlooking').action(() => {
      console.log('Looking for riders');
      this.wantRiders = true;
    });

    program.command('stoplooking').action(() => {
      console.log('Stopped looking for riders');
      this.wantRiders = false;
    });
  }
}
