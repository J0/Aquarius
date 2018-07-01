import Party from './party';
import Negotiator from './negotiator';
import { isNewRideMessage, beginNegotiationMessage } from './models';

export default class Driver extends Party {
  constructor(gridChatroom) {
    super(gridChatroom);
    this.wantRiders = false;
  }

  onMainChatroomMessage(msg, riderAddr) {
    console.log('On driver msg', msg, this.wantRiders);

    if (!this.wantRiders) return;

    if (isNewRideMessage(msg) && !(riderAddr in this.negotiators)) {
      console.log('Start negotiating with', msg, riderAddr);

      const negotiator = new Negotiator(riderAddr, this.acceptanceBoundary, true);
      this.negotiators[riderAddr] = negotiator;

      this.gridChatroom.send(beginNegotiationMessage(riderAddr, negotiator.topic));

      negotiator
        .negotiate(true)
        .then(async (a) => {
          console.log('Negotiation successful!', a);
          await this.cancelAllNegotiations();
        })
        .catch(async (e) => {
          console.log('Negotiation failed', e);
          await negotiator.destroy();
        });
    }
  }

  async cancelAllNegotiations() {
    console.log('Stopped looking for riders');
    this.wantRiders = false;
    await this.clearNegotiators();
  }

  registerCommands(program) {
    super.registerCommands(program);

    program.command('startlooking <lowerPriceBoundary>').action((acceptanceBoundary) => {
      console.log('Looking for riders', acceptanceBoundary);
      this.wantRiders = true;
      this.acceptanceBoundary = acceptanceBoundary;
    });

    program.command('stoplooking').action(async () => {
      await this.cancelAllNegotiations();
    });
  }
}
