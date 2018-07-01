import Party from './party';
import Negotiator from './negotiator';
import { newRideMessage, isBeginNegotiationMessage } from './models';

const PING_INTERVAL = 3000;

export default class Rider extends Party {
  constructor(gridChatroom, acceptanceBoundary) {
    super(gridChatroom, acceptanceBoundary);
    this.wantDrivers = false;
    this.acceptanceBoundary = acceptanceBoundary;
  }

  onMainChatroomMessage(msg, driverAddr) {
    console.log('On rider msg', msg, this.wantDrivers);

    if (!this.wantDrivers) return;

    if (isBeginNegotiationMessage(msg)) {
      console.log('Start negotiating with', msg, driverAddr);

      const negotiator = new Negotiator(driverAddr, this.acceptanceBoundary, false, msg.topic);
      this.negotiators[driverAddr] = negotiator;

      negotiator
        .negotiate()
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

  sendNewRidePing() {
    this.gridChatroom.send(newRideMessage('LOC1', 'LOC2'));
  }

  async cancelAllNegotiations() {
    console.log('Stopped looking for drivers');
    this.wantDrivers = false;
    this.pingTimer && clearInterval(this.pingTimer);
    this.pingTimer = null;
    await this.clearNegotiators();
  }

  registerCommands(program) {
    super.registerCommands(program);

    program.command('ride').action(() => {
      console.log('Looking for drivers');
      this.wantDrivers = true;
      if (!this.pingTimer) {
        this.sendNewRidePing();
        this.pingTimer = setInterval(this.sendNewRidePing.bind(this), PING_INTERVAL);
      }
    });

    program.command('cancel').action(async () => {
      await this.cancelNegotiators();
    });
  }
}
