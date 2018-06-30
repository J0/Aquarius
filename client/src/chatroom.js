export default class Chatroom {
  constructor(topic, ipfsPubsub, onMessageCallback) {
    this.topic = topic;
    this.onMessageCallback = onMessageCallback;
    this.pubsub = ipfsPubsub;
    this.pubsub.subscribe(this.topic, this.messageHandler, { discover: true });
  }

  messageHandler = (msg) => {
    try {
      const messageObj = JSON.parse(msg.data.toString());
      console.log(
        `Chatroom ${this.topic} got message "${JSON.stringify(messageObj)}" from ${msg.from}. ${
          this.onMessageCallback
        }`,
      );
      this.onMessageCallback && this.onMessageCallback(messageObj, msg.from);
    } catch (e) {}
  };

  async send(messageObj) {
    return this.pubsub.publish(this.topic, Buffer.from(JSON.stringify(messageObj)));
  }

  async destroy() {
    return this.pubsub.unsubscribe(this.topic, this.onMessageCallback);
  }
}
