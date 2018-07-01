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
  constructor(otherParty, priceCeil, priceFloor, idealPrice, stopDelta, preferHigh, topic) {
    this.state = new StateMachine({
      init: 'bigbang',
      transitions: [
        { name: 'offer', from: 'bigbang', to: 'negotiating' },
        { name: 'offer', from: 'negotiating', to: 'negotiating' },
        { name: 'timeout', from: '*', to: 'timedout' },
        { name: 'permReject', from: 'negotiating', to: 'rejected' },
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
    this.price = { priceCeil, priceFloor, idealPrice, stopDelta, preferHigh };
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
    if (this.price.preferHigh) return price > this.price.idealPrice;
    return price < this.price.idealPrice;
  }

  initialOffer() {
    return this.price.preferHigh ? this.price.priceCeil : this.price.priceFloor;
  }

  counteroffer(price) {
    if (!price || price < 0) return this.initialOffer();
    if (this.price.preferHigh) return (this.price.priceCeil + price) / 2.0;
    return (this.price.priceFloor + price) / 2.0;
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
    this.state.startConfirmation();
    this.chatroom.send(confirmRideMessage(this.otherParty, price));
    this.resetSilenceTimer();
  }

  messageHandler(msg) {
    if (['destroyed', 'confirmed', 'rejected', 'timedout'].includes(this.state.state)) return;

    switch (this.state.state) {
      case 'bigbang':
      case 'negotiating': {
        if (isNewOfferMessage(msg)) {
          this.handleOffer(msg.price);
        } else if (isConfirmRideMessage(msg)) {
          this.sendRideConfirmation();
          // TODO: Confirm that we want to accept this confirmation
          this.state.confirm();
          this.resetSilenceTimer(false);
        }
        break;
      }

      case 'confirming': {
        if (isNewOfferMessage(msg)) {
          // We're confirming and got another offer message
          this.state.offer();
          this.handleOffer(msg.price);
        } else if (isConfirmRideMessage(msg)) {
          // We're confirming and got confirmation message
          // TODO: Confirm that confirmed price is the same one that we suggested
          this.state.confirm();
          this.resetSilenceTimer(false);
        }
        break;
      }
    }
  }

  negotiate(shouldSendInitialOffer) {
    setTimeout(() => {
      this.state.timeout();
    }, NEGO_MAX_DURATION);

    if (shouldSendInitialOffer) {
      const ping = () => {
        if (!this.state.is('bigbang')) return;
        const offer = this.initialOffer();
        this.chatroom.send(newOfferMessage(this.otherParty, this.counteroffer(offer)));
        setTimeout(ping, 300);
      };
      ping();
    }

    return new Promise((resolve, reject) => {
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
          resolve();
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
