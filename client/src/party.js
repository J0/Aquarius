import inquirer from 'inquirer';
import { Subject } from 'rxjs';
import MultipleNegotiator from './multipleNegotiator';

export default class Party {
  constructor(gridChatroom) {
    this.gridChatroom = gridChatroom;
    this.gridChatroom.setOnMessageCallback(this.onMainChatroomMessage.bind(this));
    this.multipleNegotiator = new MultipleNegotiator(this.gridChatroom);
  }

  onMainChatroomMessage(msg, otherAddr) {}

  async clearNegotiators() {
    await Promise.all(Object.values(this.negotiators).map((negotiator) => negotiator.destroy()));
    this.negotiators = {};
  }

  startRepl() {
    this.prompts = new Subject();
    this.bottomBar = new inquirer.ui.BottomBar();
    this.inquirer = inquirer.prompt(this.prompts);
  }
}
