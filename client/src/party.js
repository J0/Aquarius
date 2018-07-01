export default class Party {
  constructor(gridChatroom) {
    this.gridChatroom = gridChatroom;
    this.gridChatroom.setOnMessageCallback(this.onMainChatroomMessage.bind(this));
    this.negotiators = {};
  }

  onMainChatroomMessage(msg, otherAddr) {
    console.log('On party msg', msg);
  }

  async clearNegotiators() {
    await Promise.all(Object.values(this.negotiators).map((negotiator) => negotiator.destroy()));
    this.negotiators = {};
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
