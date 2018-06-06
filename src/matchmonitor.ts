<<<<<<< HEAD
import ScalpsCoreRestApi = require('matchmore_core_rest_api');
import { Manager } from './manager';
=======
import { Manager } from "./manager";
import * as models from "./model/models";
import WebSocket = require("websocket");

export enum MatchMonitorMode {
  polling,
  websocket
}
>>>>>>> quickfix/add_gitignore

export class MatchMonitor {
  private _timerId?: number;
  private _deliveredMatches: models.Match[] = [];

  private _onMatch: (match: models.Match) => void;

  constructor(public manager: Manager) {
    this._onMatch = (match: models.Match) => {};
  }

  set onMatch(onMatch: (match: models.Match) => void) {
    this._onMatch = onMatch;
  }

  get deliveredMatches(): models.Match[] {
    return this._deliveredMatches;
  }

  public startMonitoringMatches(mode: MatchMonitorMode) {
    if (!this.manager.defaultDevice)
      throw new Error("Default device not yet set!");
    if (mode == MatchMonitorMode.polling) {
      this.stopMonitoringMatches();
      let timer = setInterval(() => {
        this.checkMatches();
      }, 1000);
      return;
    }
    if (mode == MatchMonitorMode.websocket) {
      let socketUrl =
        this.manager.apiUrl
          .replace("https://", "wss://")
          .replace("http://", "ws://")
          .replace("v5", "") +
        "pusher/v5/ws/" +
        this.manager.defaultDevice.id;
      let ws = new WebSocket(socketUrl, ["api-key", this.manager.token.sub]);
      ws.onopen = msg => console.log("opened");
      ws.onerror = msg => console.log(msg);
      ws.onmessage = msg => this.checkMatch(msg.data as string);
    }
  }

  public stopMonitoringMatches() {
    if (this._timerId) {
      clearInterval(this._timerId);
    }
  }

  private checkMatch(matchId: string) {
    if (!this.manager.defaultDevice) return;
    if (this.hasNotBeenDelivered({ id: matchId })) {
      this.manager
        .getMatch(matchId, this.manager.defaultDevice.id)
        .then(match => {
          this._deliveredMatches.push(match);
          this.onMatch(match);
        });
    }
  }

  private checkMatches() {
    this.manager.getAllMatches().then(matches => {
      for (let idx in matches) {
        let match = matches[idx];
        if (this.hasNotBeenDelivered(match)) {
          this._deliveredMatches.push(match);
          this.onMatch(match);
        }
      }
    });
  }

  private hasNotBeenDelivered(match: { id?: string }): boolean {
    for (let idx in this._deliveredMatches) {
      let deliveredMatch = this._deliveredMatches[idx];
      if (deliveredMatch.id == match.id) return false;
    }
    return true;
  }
}
