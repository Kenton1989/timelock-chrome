import { CustomEventWrapper } from "./custom-event-wrapper";
import { HostnameSet } from "./hostname-set";
import { RemoteCallable } from "./remote-callable.js";

const NEW_SCHEDULE = "timing-monitor-new-schedule";
const TIMES_UP = "timing-monitor-times-up";
const MINIMAL_UNLOCK_TIME = 1000;

class LockTimeMonitor extends RemoteCallable {
  #restTimeMap = new Map();

  constructor(name) {
    super(name);
  }

  /**
   * Check if the hostname is in the unlocked list.
   * 
   * @param {String} hostname the hostname to be checked.
   */
  isUnlocked(hostname) {
    return this.#restTimeMap.has(hostname);
  }

  /**
   * Check the rest unlocked time of the given hostname 
   * @param {String} hostname the hostname to be checked.
   * @returns {(Number|undefined)} the rest unlock time in milliseconds,
   *   or undefined if the hostname is not in the unlock list.
   */
  restTime(hostname) {
    let endTimePoint = this.#restTimeMap.get(hostname);
    if (endTimePoint == undefined) return undefined;
    return endTimePoint - Date.now();
  }

  /**
   * Check the ending time point of unlock period of the given hostname.
   * @param {String} hostname the hostname to be checked.
   * @returns {(Number|undefined)} the end time point of unlock time,
   *   or undefined if the hostname is not in the unlock list.
   */
  endTimePoint(hostname) {
    return this.#restTimeMap.get(hostname);
  }

  /**
   * Unlock the given hostname until the given time point.
   *
   * @param {String} hostname the hostname to unlock
   * @param {(Number|Date)} timePoint the ending time point of unlock.
   */
  unlockUntil(hostname, timePoint) {
    if (timePoint instanceof Date) timePoint = timePoint.getTime();

    let duration = timePoint - Date.now();
    if (duration <= MINIMAL_UNLOCK_TIME) return;

    this.#restTimeMap.set(hostname, timePoint);
    
    let restTimeMap = this.#restTimeMap;
    window.setInterval(function(){
      restTimeMap.delete(hostname);
    }, timePoint - Date.now());
  }

  /**
   * Unlock the given hostname for the given period.
   *
   * @param {String} hostname the hostname to unlock
   * @param {Number} milliseconds the duration of unlock
   */
  unlockFor(hostname, milliseconds) {
    this.unlockUntil(hostname, Date.now() + milliseconds);
  }
}

export { LockTimeMonitor };
