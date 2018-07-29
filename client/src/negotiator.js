import uuid from 'uuid/v4';
import StateMachine from 'javascript-state-machine';
import ipfs from './ipfsWrapper';
import {
  newOfferMessage,
  isNewOfferMessage,
  confirmPriceMessage,
  isConfirmPriceMessage,
  pendingSelectionMessage,
  isPendingSelectionMessage,
  confirmRideMessage,
  isConfirmRideMessage,
} from './models';

const NEGO_MAX_DURATION = 10000;
const SILENCE_TIMEOUT = 1000;
const SELECTION_PING_INTERVAL = 300;

export default class Negotiator {
  constructor(otherParty, price, topic) {
    this.state = new StateMachine({
      init: 'bigbang',
      transitions: [
        { name: 'offer', from: 'bigbang', to: 'negotiating' },
        { name: 'offer', from: 'negotiating', to: 'negotiating' },
        { name: 'startPriceConfirmation', from: 'bigbang', to: 'confirmingPrice' },
        { name: 'startPriceConfirmation', from: 'negotiating', to: 'confirmingPrice' },
        { name: 'offer', from: 'confirmingPrice', to: 'negotiating' },
        { name: 'confirmPrice', from: 'confirmingPrice', to: 'pendingSelection' },
        { name: 'selectRide', from: 'pendingSelection', to: 'confirmingRide' },
        { name: 'confirmRide', from: 'confirmingRide', to: 'confirmedRide' },
        { name: 'timeout', from: '*', to: 'timedout' },
        { name: 'destroy', from: '*', to: 'destroyed' },
      ],
    });

    this.otherParty = otherParty;
    this.topic = topic || uuid();
    this.chatroom = ipfs.createChatroom(this.topic);
    this.chatroom.setOnMessageCallback(this.messageHandler.bind(this));
    this.price = price;

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
      this.sendPriceConfirmation(theirOffer);
      return;
    }

    const ourOffer = this.counteroffer(theirOffer);
    this.chatroom.send(newOfferMessage(this.otherParty, ourOffer));
    this.resetSilenceTimer();
  }

  sendPriceConfirmation(price) {
    this.priceToConfirm = price;
    this.state.startPriceConfirmation();
    this.chatroom.send(confirmPriceMessage(this.otherParty, price));
    this.resetSilenceTimer();
  }

  sendPendingSelectionPing() {
    const price = this.priceToConfirm;
    this.chatroom.send(pendingSelectionMessage(this.otherParty, price));
  }

  startPendingSelectionPing() {
    this.stopPinging();
    this.sendPendingSelectionPing();
    this.pingTimer = setInterval(this.sendPendingSelectionPing.bind(this), SELECTION_PING_INTERVAL);
  }

  sendConfirmRidePing() {
    const price = this.priceToConfirm;
    this.chatroom.send(confirmRideMessage(this.otherParty, price));
  }

  startConfirmRidePing() {
    this.stopPinging();
    this.sendConfirmRidePing();
    this.pingTimer = setInterval(this.sendConfirmRidePing.bind(this), SELECTION_PING_INTERVAL);
  }

  stopPinging() {
    this.pingTimer && clearInterval(this.pingTimer);
    this.pingTimer = null;
  }

  messageHandler(msg) {
    if (['bigbang', 'negotiating', 'confirmingPrice'].includes(this.state.state)) {
      if (!isNewOfferMessage(msg) && !isConfirmPriceMessage(msg)) return;
      const offer = msg.price;

      if (isConfirmPriceMessage(msg)) {
        if (this.state.is('confirmingPrice')) {
          // We're confirmingPrice and got confirmation message
          // Confirm that confirmed price is the same one that we suggested
          if (offer === this.priceToConfirm) {
            this.state.confirmPrice();
            this.startPendingSelectionPing();
            this.resetSilenceTimer();
            return;
          }
        } else if (this.shouldAccept(offer)) {
          // We're negotiating and got an offer.
          // Confirm that we want to accept this confirmation.
          this.sendPriceConfirmation(offer);
          this.resetSilenceTimer();
          return;
        }
      }

      this.handleOffer(offer);
    } else if (this.state.is('pendingSelection')) {
      if (isPendingSelectionMessage(msg) || isConfirmRideMessage(msg)) {
        this.resetSilenceTimer();
      }
    } else if (this.state.is('confirmingRide')) {
      if (isPendingSelectionMessage(msg)) {
        this.resetSilenceTimer();
      } else if (isConfirmRideMessage(msg)) {
        this.stopPinging();
        this.sendConfirmRidePing();
        this.resetSilenceTimer(false);
        this.state.confirmRide();
      }
    }
  }

  negotiate(shouldSendInitialOffer) {
    this.negoTimeout = setTimeout(() => {
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

    const negotiator = this;
    this.state.observe({
      onTimedout() {
        negotiator.stopPinging();
        negotiator.onTimeout && negotiator.onTimeout(new Error('Negotiation took too long'));
      },
      onConfirmPrice() {
        negotiator.negoTimeout && clearTimeout(negotiator.negoTimeout);
        negotiator.onConfirmedPrice &&
          negotiator.onConfirmedPrice({ price: negotiator.priceToConfirm });
      },
      onConfirmedRide() {
        negotiator.onConfirmedRide &&
          negotiator.onConfirmedRide({ price: negotiator.priceToConfirm });
      },
    });
  }

  select() {
    if (!this.state.is('pendingSelection')) return;
    this.state.selectRide();
    this.startConfirmRidePing();
  }

  async destroy() {
    if (this.state.is('destroyed')) return;
    this.state.destroy();
    await this.chatroom.destroy();
  }
}
