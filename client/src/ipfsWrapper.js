import IPFS from 'ipfs';
import Chatroom from './chatroom';

class IPFSWrapper {
  setup() {
    const node = new IPFS({
      EXPERIMENTAL: {
        pubsub: true,
        relay: {
          enabled: true,
          hop: { enabled: true, active: false },
        },
      },
    });

    const nodeReadyPromise = new Promise((resolve) => {
      node.once('ready', () => resolve());
    });

    return nodeReadyPromise.then(() => node.id()).then((identity) => {
      this.node = node;
      this.identity = identity;
      return this;
    });
  }

  createChatroom(topic) {
    return new Chatroom(topic, this.node.pubsub, this.identity.id);
  }
}

// Create IPFS wrapper singleton
const ipfsWrapper = new IPFSWrapper();
export default ipfsWrapper;
