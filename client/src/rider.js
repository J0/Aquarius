import Party from './party';
import v8n from 'v8n';
import { newRideMessage } from './models';

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
          this.multipleNegotiator
            .startNegotiating(this.acceptanceBoundary, false, false)
            .then((a) => {
              console.log('Ha multi negotiation successful', a);
            })
            .catch((e) => {
              console.log('Multi negotiation failed', e);
            })
            .finally(async () => {
              this.stopPinging();
              // Start asking again
              await this.multipleNegotiator.reset();
              this.addMaxPricePrompt();
            });
          this.startPinging();
        } else {
          // Start asking again
          this.addMaxPricePrompt();
        }
        break;
    }
  }

  sendNewRidePing() {
    this.gridChatroom.send(newRideMessage('LOC1', 'LOC2'));
  }

  startPinging() {
    if (!this.pingTimer) {
      this.sendNewRidePing();
      this.pingTimer = setInterval(this.sendNewRidePing.bind(this), PING_INTERVAL);
    }
  }

  stopPinging() {
    this.pingTimer && clearInterval(this.pingTimer);
    this.pingTimer = null;
  }
}
