export default class Party {
  constructor(gridChatroom) {
    this.gridChatroom = gridChatroom;
    this.gridChatroom.setOnMessageCallback(this.onMainChatroomMessage.bind(this));
    this.negotiators = {};
  }

  derp() {
    return "I'm a derp";
  }

  onMainChatroomMessage(msg, otherAddr) {
    console.log('On party msg', msg);
  }

  registerCommands(program) {
    program.command('help').action(() => {
      console.log('No help for you');
    });

    program.on('--help', () => {
      console.log('HELP? What help');
    });
  }
}
