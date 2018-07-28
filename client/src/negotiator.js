import uuid from 'uuid/v4';
import StateMachine from 'javascript-state-machine';
import ipfs from './ipfsWrapper';
import {
  newOfferMessage,
  isNewOfferMessage,
  confirmRideMessage,
  isConfirmRideMessage,
} from './models';

const NEGO_MAX_DURATION = 10000;
const SILENCE_TIMEOUT = 1000;

export default class Negotiator {
  constructor(otherParty, acceptanceBoundary, preferHigh, topic) {
    this.state = new StateMachine({
      init: 'bigbang',
      transitions: [
        { name: 'offer', from: 'bigbang', to: 'negotiating' },
        { name: 'offer', from: 'negotiating', to: 'negotiating' },
        { name: 'timeout', from: '*', to: 'timedout' },
        { name: 'permReject', from: 'negotiating', to: 'rejected' },
        { name: 'startConfirmation', from: 'bigbang', to: 'confirming' },
        { name: 'startConfirmation', from: 'negotiating', to: 'confirming' },
        { name: 'offer', from: 'confirming', to: 'negotiating' },
        { name: 'confirm', from: 'confirming', to: 'confirmed' },
        { name: 'destroy', from: '*', to: 'destroyed' },
      ],
    });

    this.otherParty = otherParty;
    this.topic = topic || uuid();
    this.chatroom = ipfs.createChatroom(this.topic);
    this.chatroom.setOnMessageCallback(this.messageHandler.bind(this));
    this.price = {
      priceCeil: acceptanceBoundary * 2,
      priceFloor: acceptanceBoundary / 2,
      acceptanceBoundary,
      preferHigh,
    };

    this.ourOffer = this.initialOffer();
  }

  resetSilenceTimer(shouldRestart = true) {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.silenceTimer = null;
    if (!shouldRestart) return;
    this.silenceTimer = setTimeout(() => {
      this.state.timeout();
    }, SILENCE_TIMEOUT);
  }

  shouldAccept(price) {
    if (!price) return false;
    if (this.price.preferHigh) return price > this.price.acceptanceBoundary;
    return price < this.price.acceptanceBoundary;
  }

  initialOffer() {
    return this.price.preferHigh ? this.price.priceCeil : this.price.priceFloor;
  }

  counteroffer(price) {
    if (!price || price < 0) return this.ourOffer;
    const { preferHigh, priceCeil, priceFloor } = this.price;
    const base = preferHigh ? priceCeil : priceFloor;
    const diff = base - price;
    return price + diff / 6.0;
  }

  handleOffer(theirOffer) {
    this.state.offer();
    if (this.shouldAccept(theirOffer)) {
      this.sendRideConfirmation(theirOffer);
      return;
    }

    const ourOffer = this.counteroffer(theirOffer);
    this.chatroom.send(newOfferMessage(this.otherParty, ourOffer));
    this.resetSilenceTimer();
  }

  sendRideConfirmation(price) {
    this.priceToConfirm = price;
    this.state.startConfirmation();
    this.chatroom.send(confirmRideMessage(this.otherParty, price));
    this.resetSilenceTimer();
  }

  confirm() {
    this.state.confirm();
    this.resetSilenceTimer(false);
  }

  messageHandler(msg) {
    if (['destroyed', 'confirmed', 'rejected', 'timedout'].includes(this.state.state)) return;
    if (!isNewOfferMessage(msg) && !isConfirmRideMessage(msg)) return;

    const offer = msg.price;

    if (isConfirmRideMessage(msg)) {
      if (this.state.is('confirming')) {
        // We're confirming and got confirmation message
        // Confirm that confirmed price is the same one that we suggested
        if (offer === this.priceToConfirm) {
          this.confirm();
          return;
        }
      } else if (this.shouldAccept(offer)) {
        // We're negotiating and got an offer.
        // Confirm that we want to accept this confirmation.
        this.sendRideConfirmation(offer);
        this.confirm();
        return;
      }
    }

    this.handleOffer(offer);
  }

  negotiate(shouldSendInitialOffer) {
    setTimeout(() => {
      this.state.timeout();
    }, NEGO_MAX_DURATION);

    if (shouldSendInitialOffer) {
      const ping = () => {
        if (!this.state.is('bigbang')) return;
        const offer = this.ourOffer;
        this.chatroom.send(newOfferMessage(this.otherParty, this.counteroffer(offer)));
        setTimeout(ping, 300);
      };
      ping();
    }

    return new Promise((resolve, reject) => {
      const negotiator = this;
      this.state.observe({
        onTimedout() {
          console.log('Timedout');
          reject(new Error('Negotiation took too long'));
        },
        onRejected() {
          console.log('Rejected');
          reject(new Error('Permanently rejected'));
        },
        onConfirmed() {
          console.log('Confirmed!');
          resolve({ price: negotiator.priceToConfirm });
        },
      });
    });
  }

  async destroy() {
    if (this.state.is('destroyed')) return;
    this.state.destroy();
    await this.chatroom.destroy();
  }
}
