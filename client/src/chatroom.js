export default class Chatroom {
  constructor(topic, ipfsPubsub, currentAddress) {
    this.topic = topic;
    this.pubsub = ipfsPubsub;
    this.currentAddress = currentAddress;
    this.onMessageCallback = this.messageHandler.bind(this);
    this.pubsub.subscribe(this.topic, this.onMessageCallback, { discover: true });
  }

  setOnMessageCallback(onMessageCallback) {
    this.onMessageCallback = onMessageCallback;
  }

  messageHandler(msg) {
    try {
      const messageObj = JSON.parse(msg.data.toString());

      // Ignore messages from us
      if (msg.from === this.currentAddress) return;

      console.log(
        `Chatroom ${this.topic} got message "${JSON.stringify(messageObj)}" from ${msg.from}`,
      );
      this.onMessageCallback && this.onMessageCallback(messageObj, msg.from);
    } catch (e) {}
  }

  async send(messageObj) {
    return this.pubsub.publish(this.topic, Buffer.from(JSON.stringify(messageObj)));
  }

  async destroy() {
    return this.pubsub.unsubscribe(this.topic, this.onMessageCallback);
  }
}
