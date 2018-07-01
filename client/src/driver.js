import Party from './party';
import Negotiator from './negotiator';
import { isNewRideMessage, beginNegotiationMessage } from './models';

export default class Driver extends Party {
  constructor(gridChatroom) {
    super(gridChatroom);
    // this.wantRiders = false;
    this.wantRiders = true;
  }

  onMainChatroomMessage(msg, riderAddr) {
    console.log('On driver msg', msg, this.wantRiders);

    if (!this.wantRiders) return;

    if (isNewRideMessage(msg) && !(riderAddr in this.negotiators)) {
      console.log('Start negotiating with', msg, riderAddr);

      const negotiator = new Negotiator(10, 0, 3, 0.2, true);
      this.negotiators[riderAddr] = negotiator;

      this.gridChatroom.send(beginNegotiationMessage(riderAddr, negotiator.topic));

      negotiator
        .negotiate()
        .then((a) => {
          console.log('Negotiation successful!', a);
        })
        .catch((e) => {
          console.log('Negotiation failed', e);
        })
        .finally(async () => {
          console.log('Foinally');
          await negotiator.destroy();
        });
    }
  }

  registerCommands(program) {
    super.registerCommands(program);

    program.command('startlooking').action(() => {
      console.log('Looking for riders');
      this.wantRiders = true;
    });

    program.command('stoplooking').action(async () => {
      console.log('Stopped looking for riders');
      this.wantRiders = false;
      await this.clearNegotiators();
    });
  }
}
