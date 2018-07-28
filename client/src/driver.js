import Party from './party';
import Negotiator from './negotiator';
import v8n from 'v8n';
import { isNewRideMessage, beginNegotiationMessage } from './models';

export default class Driver extends Party {
  constructor(gridChatroom) {
    super(gridChatroom);
    this.wantRiders = false;
  }

  startRepl() {
    super.startRepl();
    this.inquirer.ui.process.subscribe(this.onEachAnswer.bind(this));
    this.addMinPricePrompt();
  }

  addMinPricePrompt() {
    this.prompts.next({
      type: 'input',
      name: 'acceptanceBoundary',
      message: "What is the minimum price you'll accept?",
      validate: (input) =>
        v8n()
          .number()
          .greaterThan(0)
          .test(parseInt(input, 10)),
    });
  }

  addStartLookingConfirmationPrompt() {
    this.prompts.next({
      type: 'confirm',
      name: 'confirmStart',
      message: `Start looking for riders who will pay >= $${this.acceptanceBoundary}?`,
      default: false,
    });
  }

  onEachAnswer({ name, answer }) {
    switch (name) {
      case 'acceptanceBoundary':
        this.acceptanceBoundary = answer;
        this.addStartLookingConfirmationPrompt();
        break;
      case 'confirmStart':
        if (answer) {
          // Start looking for riders
          this.bottomBar.log.write(`Looking for riders ${this.acceptanceBoundary}`);
          this.wantRiders = true;
        } else {
          // Start asking again
          this.addMinPricePrompt();
        }
        break;
    }
  }

  onMainChatroomMessage(msg, riderAddr) {
    this.bottomBar.log.write(`On driver msg ${JSON.stringify(msg)} ${this.wantRiders}`);

    if (!this.wantRiders) return;

    if (isNewRideMessage(msg) && !(riderAddr in this.negotiators)) {
      this.bottomBar.log.write(`Start negotiating with ${JSON.stringify(msg)} ${riderAddr}`);

      const negotiator = new Negotiator(riderAddr, this.acceptanceBoundary, true);
      this.negotiators[riderAddr] = negotiator;

      this.gridChatroom.send(beginNegotiationMessage(riderAddr, negotiator.topic));

      negotiator
        .negotiate(true)
        .then(async (a) => {
          this.bottomBar.log.write(`Negotiation successful! ${JSON.stringify(msg)}`);
          await this.cancelAllNegotiations();
        })
        .catch(async (e) => {
          this.bottomBar.log.write(`Negotiation failed, ${e}`);
          await negotiator.destroy();
        });
    }
  }

  async cancelAllNegotiations() {
    this.bottomBar.log.write('Stopped looking for riders');
    this.wantRiders = false;
    await this.clearNegotiators();
  }

  // registerCommands(program) {
  // super.registerCommands(program);

  // program.command('startlooking <lowerPriceBoundary>').action((acceptanceBoundary) => {
  // this.bottomBar.log.write('Looking for riders', acceptanceBoundary);
  // this.wantRiders = true;
  // this.acceptanceBoundary = acceptanceBoundary;
  // });

  // program.command('stoplooking').action(async () => {
  // await this.cancelAllNegotiations();
  // });
  // }
}
