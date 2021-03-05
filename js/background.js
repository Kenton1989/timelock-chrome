import { BrowsingPageMonitor } from "./browsing-page-monitor.js";
import { HostTimingMonitor } from "./host-timing-monitor.js";
import {
  ALL_OPTION_NAME,
  DEFAULT_OPTIONS,
  OptionCollection,
} from "./options-manager.js";
import { blockAllTabsOf, blockPageToSelectTime } from "./tab-blocker.js";

let options = new OptionCollection(...ALL_OPTION_NAME);

chrome.runtime.onInstalled.addListener(function () {
  chrome.storage.local.get(DEFAULT_OPTIONS, function (result) {
    chrome.storage.local.set(result, function () {
      console.debug("Set config: ", result);
    });
  });
});

let monitor = new BrowsingPageMonitor("browse-monitor");
let unlockTiming = new HostTimingMonitor("lock-time-monitor");
let calmDownTiming = new HostTimingMonitor("calm-down-time-monitor");
unlockTiming.stopTiming
options.monitoredList.doOnUpdated(function (list) {
  if (!list) return;
  monitor.blacklist.reset(list);
});

options.whitelistHost.doOnUpdated(function (list) {
  if (!list) return;
  monitor.whitelist.reset(list);
});

function selectTime(tab, hostname) {
  console.debug(`Blocking the tab of host: ${hostname}`);
  if (unlockTiming.isTiming(hostname)) {
    console.debug(`${hostname} is unlocked, does not block.`);
    return;
  }
  blockPageToSelectTime(tab, hostname);
}

monitor.onBrowse.addListener(selectTime);

unlockTiming.onTimesUp.addListener(function (hostname) {
  blockAllTabsOf(hostname);
});

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.queryHostMonitoredState) {
    let url = message.queryHostMonitoredState.url;
    let state = {
      isMonitored: false,
      monitoredHost: undefined,
      isUnlocked: undefined,
      unlockEndTime: undefined,
      needCalmDown: undefined,
      calmDownEndTime: undefined,
    };

    let actualMonitored = monitor.isMonitoring(url);
    if (actualMonitored) {
      state.isMonitored = true;
      state.monitoredHost = actualMonitored;

      let unlockEndTime = unlockTiming.endTimePoint(actualMonitored);
      if (unlockEndTime != undefined) {
        state.isUnlocked = true;
        state.unlockEndTime = unlockEndTime;
      }
      
      let calmDownEndTime = calmDownTiming.endTimePoint(actualMonitored);
      if (calmDownEndTime != undefined) {
        state.needCalmDown = true;
        state.calmDownEndTime = calmDownEndTime;
      }
    }
    sendResponse(state);
  }
});
