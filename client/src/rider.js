import Party from './party';
import Negotiator from './negotiator';
import v8n from 'v8n';
import { newRideMessage, isBeginNegotiationMessage } from './models';

const PING_INTERVAL = 3000;

export default class Rider extends Party {
  constructor(gridChatroom) {
    super(gridChatroom);
    this.wantDrivers = false;
  }

  startRepl() {
    super.startRepl();
    this.inquirer.ui.process.subscribe(this.onEachAnswer.bind(this));
    this.addMaxPricePrompt();
  }

  addMaxPricePrompt() {
    this.prompts.next({
      type: 'input',
      name: 'acceptanceBoundary',
      message: "What is the maximum price you'll pay?",
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
      message: `Start looking for drivers who will accept <= $${this.acceptanceBoundary}?`,
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
          // Start looking for drivers
          this.bottomBar.log.write(`Looking for drivers ${this.acceptanceBoundary}`);
          this.wantDrivers = true;
          if (!this.pingTimer) {
            this.sendNewRidePing();
            this.pingTimer = setInterval(this.sendNewRidePing.bind(this), PING_INTERVAL);
          }
        } else {
          // Start asking again
          this.addMaxPricePrompt();
        }
        break;
    }
  }

  onMainChatroomMessage(msg, driverAddr) {
    this.bottomBar.log.write(`On rider msg ${JSON.stringify(msg)} ${this.wantDrivers}`);

    if (!this.wantDrivers) return;

    if (isBeginNegotiationMessage(msg)) {
      this.bottomBar.log.write(`Start negotiating with ${JSON.stringify(msg)} ${driverAddr}`);

      const negotiator = new Negotiator(driverAddr, this.acceptanceBoundary, false, msg.topic);
      this.negotiators[driverAddr] = negotiator;

      negotiator
        .negotiate()
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

  sendNewRidePing() {
    this.gridChatroom.send(newRideMessage('LOC1', 'LOC2'));
  }

  async cancelAllNegotiations() {
    this.bottomBar.log.write('Stopped looking for drivers');
    this.wantDrivers = false;
    this.pingTimer && clearInterval(this.pingTimer);
    this.pingTimer = null;
    await this.clearNegotiators();
  }

  // registerCommands(program) {
  // super.registerCommands(program);

  // program.command('ride <upperPriceBoundary>').action((acceptanceBoundary) => {
  // this.bottomBar.log.write('Looking for drivers', acceptanceBoundary);
  // this.wantDrivers = true;
  // this.acceptanceBoundary = acceptanceBoundary;
  // if (!this.pingTimer) {
  // this.sendNewRidePing();
  // this.pingTimer = setInterval(this.sendNewRidePing.bind(this), PING_INTERVAL);
  // }
  // });

  // program.command('cancel').action(async () => {
  // await this.cancelAllNegotiations();
  // });
  // }
}
