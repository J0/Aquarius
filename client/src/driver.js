import Party from './party';
import v8n from 'v8n';

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
          this.prompts.complete();
          this.bottomBar.log.write(`Looking for riders ${this.acceptanceBoundary}`);
          this.multipleNegotiator
            .startNegotiating(this.acceptanceBoundary, true, true)
            .then((a) => {
              console.log('Ha multi negotiation successful', a);
            })
            .catch((e) => {
              console.log('Multi negotiation failed', e);
            })
            .finally(async () => {
              // Start asking again
              await this.multipleNegotiator.reset();
              this.startRepl();
            });
        } else {
          // Start asking again
          this.addMinPricePrompt();
        }
        break;
    }
  }
}
