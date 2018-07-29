import StateMachine from 'javascript-state-machine';
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
        { name: 'confirm', from: 'selecting', to: 'confirmed' },
        // { name: 'select', from: 'selecting', to: 'awaitingConfirmation' },
        // { name: 'startSelecting', from: 'awaitingConfirmation', to: 'selecting' },
        // { name: 'confirm', from: 'awaitingConfirmation', to: 'confirmed' },
      ],
      methods: {
        onAfterStartSelecting() {
          // Transition to fail state if there's nothing to be selected.
          if (Object.keys(multiNegotiator.confirmedPrices).length === 0) {
            // HACK: Transition in the next event loop, otherwise it'll crash
            setTimeout(() => {
              this.nothingToSelect();
            }, 0);
          } else {
            // TODO: Remove this block when selection implemented
            multiNegotiator.confirmedOther = Object.keys(multiNegotiator.confirmedPrices)[0];
            setTimeout(async () => {
              this.confirm();
              await multiNegotiator.cancelAllNegotiations();
            }, 0);
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
          console.log('Idling');
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
    this.confirmedOther = undefined;
    this.confirmedPrices = {};
    this.resetState();
  }

  onMainChatroomMessage(msg, otherAddr) {
    console.log(`On msg ${JSON.stringify(msg)}, ${this.state.is('negotiating')}`);
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

      negotiator
        .negotiate(this.isDriver)
        .then(async (a) => {
          console.log(`Negotiation successful! ${JSON.stringify(a)}`);
          this.confirmedPrices[otherAddr] = { otherAddr, price: a.price };
        })
        .catch(async (e) => {
          console.log(`Negotiation failed, ${JSON.stringify(e)}`);
          await negotiator.destroy();
        });
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
