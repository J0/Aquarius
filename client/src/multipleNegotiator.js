import StateMachine from 'javascript-state-machine';
import inquirer from 'inquirer';
import Negotiator from './negotiator';
import { isNewRideMessage, beginNegotiationMessage, isBeginNegotiationMessage } from './models';

const SEARCH_MAX_DURATION = 20000; // Time to negotiate before selecting

export default class MultipleNegotiator {
  constructor(gridChatroom) {
    this.gridChatroom = gridChatroom;
    this.gridChatroom.setOnMessageCallback(this.onMainChatroomMessage.bind(this));

    this.negotiators = {};
    this.confirmedPrices = {};
    this.resetState();
  }

  resetState() {
    const multiNegotiator = this;
    this.state = new StateMachine({
      init: 'start',
      transitions: [
        { name: 'startNegotiating', from: 'start', to: 'negotiating' },
        { name: 'startSelecting', from: 'negotiating', to: 'selecting' },
        { name: 'nothingToSelect', from: 'selecting', to: 'fail' },
        { name: 'cancel', from: 'selecting', to: 'fail' },
        { name: 'startSelecting', from: 'selecting', to: 'selecting' },
        { name: 'select', from: 'selecting', to: 'awaitingConfirmation' },
        { name: 'startSelecting', from: 'awaitingConfirmation', to: 'selecting' },
        { name: 'confirm', from: 'awaitingConfirmation', to: 'confirmed' },
      ],
      methods: {
        onStartSelecting() {
          // Transition to fail state if there's nothing to be selected.
          if (Object.keys(multiNegotiator.confirmedPrices).length === 0) {
            // HACK: Transition in the next event loop, otherwise it'll crash
            setTimeout(() => {
              this.nothingToSelect();
            }, 0);
          } else {
            multiNegotiator.presentSelectPrompt();
          }
        },
      },
    });
  }

  startNegotiating(acceptanceBoundary, preferHigh, isDriver) {
    this.price = {
      priceCeil: acceptanceBoundary * 2,
      priceFloor: acceptanceBoundary / 2,
      acceptanceBoundary,
      preferHigh,
    };
    this.isDriver = isDriver;

    this.state.startNegotiating();

    setTimeout(() => {
      this.state.startSelecting();
    }, SEARCH_MAX_DURATION);

    return new Promise((resolve, reject) => {
      const multiNegotiator = this;
      this.state.observe({
        onFail() {
          reject(new Error('Negotiations failed'));
        },
        onConfirmed() {
          resolve(multiNegotiator.confirmedPrices[multiNegotiator.confirmedOther]);
        },
      });
    });
  }

  async reset() {
    await this.cancelAllNegotiations();
    this.price = undefined;
    this.isDriver = undefined;
    this.confirmingOther = undefined;
    this.confirmedOther = undefined;
    this.confirmedPrices = {};
    this.resetState();
  }

  presentSelectPrompt() {
    inquirer
      .prompt([
        {
          type: 'list',
          name: 'selectPrompt',
          message: 'Choose your person!',
          choices: [
            ...Object.values(this.confirmedPrices).map(
              (price) => `Peer ${price.otherAddr} at $${price.price}`,
            ),
            'Cancel',
          ],
        },
      ])
      .then((answers) => {
        if (answers.selectPrompt === 'Cancel') {
          this.state.cancel();
          this.reject && this.reject(new Error('User cancelled'));
          return;
        }

        const addr = answers.selectPrompt.split(' ')[1];

        // Ensure that the other party is still there
        if (!Object.keys(this.confirmedPrices).includes(addr)) {
          this.state.startSelecting();
          return;
        }

        this.confirmingOther = addr;
        this.state.select();
        this.negotiators[addr].select();
      });
  }

  onMainChatroomMessage(msg, otherAddr) {
    // console.log(`On msg ${JSON.stringify(msg)}, ${this.state.is('negotiating')}`);
    if (!this.state.is('negotiating')) return;

    if (
      ((this.isDriver && isNewRideMessage(msg)) ||
        (!this.isDriver && isBeginNegotiationMessage(msg))) &&
      !(otherAddr in this.negotiators)
    ) {
      console.log(`Start negotiating with ${JSON.stringify(msg)} ${otherAddr}`);

      let topic;
      if (!this.isDriver) topic = msg.topic;

      const negotiator = new Negotiator(otherAddr, this.price, topic);
      this.negotiators[otherAddr] = negotiator;

      if (this.isDriver) {
        this.gridChatroom.send(beginNegotiationMessage(otherAddr, negotiator.topic));
      }

      const multiNegotiator = this;

      negotiator.onTimeout = async (e) => {
        console.log(
          `Timeout, ${multiNegotiator.confirmingOther} ${otherAddr} ${JSON.stringify(e)}`,
        );

        setTimeout(async () => negotiator.destroy());
        delete multiNegotiator.confirmedPrices[otherAddr];

        // Start selecting again IF we're confirming with the timeout person
        if (multiNegotiator.confirmingOther === otherAddr) {
          multiNegotiator.state.startSelecting();
        }
      };

      negotiator.onConfirmedPrice = (a) => {
        console.log(`Price negotiation successful! ${JSON.stringify(a)}`);
        multiNegotiator.confirmedPrices[otherAddr] = { otherAddr, price: a.price };
      };

      negotiator.onConfirmedRide = async (a) => {
        console.log(`Ride negotiation successful! ${JSON.stringify(a)}`);
        multiNegotiator.confirmedOther = otherAddr;
        multiNegotiator.state.confirm();
        setTimeout(async () => multiNegotiator.cancelAllNegotiations());
      };

      negotiator.negotiate(multiNegotiator.isDriver);
    }
  }

  async clearNegotiators() {
    await Promise.all(Object.values(this.negotiators).map((negotiator) => negotiator.destroy()));
    this.negotiators = {};
  }

  async cancelAllNegotiations() {
    console.log('Stopped looking');
    await this.clearNegotiators();
  }
}
