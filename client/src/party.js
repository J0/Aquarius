export default class Party {
  constructor(gridChatroom) {
    this.gridChatroom = gridChatroom;
    this.gridChatroom.setOnMessageCallback(this.onMainChatroomMessage.bind(this));
    this.negotiators = {};
  }

  onMainChatroomMessage(msg, otherAddr) {}

  async clearNegotiators() {
    await Promise.all(Object.values(this.negotiators).map((negotiator) => negotiator.destroy()));
    this.negotiators = {};
  }

  registerCommands(program) {
    program.command('help').action(() => {
      console.log('TODO: Help');
    });

    program.on('--help', () => {
      console.log('TODO: Help');
    });
  }
}
