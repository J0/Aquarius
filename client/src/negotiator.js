import uuid from 'uuid/v4';
import ipfs from './ipfsWrapper';

const NEGO_MAX_DURATION = 1000;
const SILENCE_TIMEOUT = 100;

export default class Negotiator {
  constructor(priceCeil, priceFloor, idealPrice, stopDelta, preferHigh) {
    this.alive = false;
    this.topic = uuid();
    this.chatroom = ipfs.createChatroom(this.topic);
    // this.chatroom.setOnMessageCallback
    this.price = { priceCeil, priceFloor, idealPrice, stopDelta, preferHigh };
  }

  shouldAccept(price) {
    return false;
  }

  counteroffer(price) {
    if (this.preferHigh) return (this.priceCeil + price) / 2;
    return (this.priceFloor + price) / 2;
  }

  negotiate() {
    this.alive = true;

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (this.alive) {
          this.alive = false;
          reject(new Error('Negotiation took too long'));
        }
      }, NEGO_MAX_DURATION);

      let ourOffer = this.price.idealPrice;
      if (this.preferHigh) ourOffer = (ourOffer + this.priceCeil) / 2;
      else ourOffer = (ourOffer - this.priceFloor) / 2;

      let theirOffer = null;

      // while (this.alive && shouldAccept(theirOffer))
    });
  }

  async destroy() {
    await this.chatroom.destroy();
  }
}
