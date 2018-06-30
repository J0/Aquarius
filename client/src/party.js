export default class Party {
  constructor(gridChatroom) {
    this.gridChatroom = gridChatroom;
    this.negotiators = {};
  }

  derp() {
    return "I'm a derp";
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
