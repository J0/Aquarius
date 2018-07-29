import StateMachine from 'javascript-state-machine';
import Negotiator from './negotiator';
import { isNewRideMessage, beginNegotiationMessage, isBeginNegotiationMessage } from './models';

// const SEARCH_MAX_DURATION = 20000; // Time to negotiate before selecting

export default class MultipleNegotiator {
  constructor(gridChatroom) {
    this.state = new StateMachine({
      init: 'idle',
      transitions: [
        { name: 'startNegotiating', from: 'idle', to: 'negotiating' },
        { name: 'confirm', from: 'negotiating', to: 'confirmed' },
        // { name: 'startSelecting', from: 'negotiating', to: 'idle' }, // Nothing to select from
        // { name: 'startSelecting', from: 'negotiating', to: 'selecting' },
        // { name: 'select', from: 'selecting', to: 'awaitingConfirmation' },
        // { name: 'startSelecting', from: 'awaitingConfirmation', to: 'selecting' },
        // { name: 'confirm', from: 'awaitingConfirmation', to: 'confirmed' },
        { name: 'reset', from: '*', to: 'idle' },
      ],
    });

    this.gridChatroom = gridChatroom;
    this.gridChatroom.setOnMessageCallback(this.onMainChatroomMessage.bind(this));

    this.negotiators = {};
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

    return new Promise((resolve, reject) => {
      const negotiator = this;
      this.state.observe({
        onIdle() {
          console.log('Idling');
          reject(new Error('Negotiations failed'));
        },
        onConfirmed() {
          resolve(negotiator.ridePrice);
        },
      });
    });
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
          this.ridePrice = {
            otherAddr,
            price: a.price,
          };
          this.state.confirm();
          await this.cancelAllNegotiations();
        })
        .catch(async (e) => {
          console.log(`Negotiation failed, ${e}`);
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
