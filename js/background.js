import { getUrlOfTab } from "./utility.js";
import { DynamicPageBackend } from "./dynamic-page-backend.js";
import { BrowsingPageMonitor } from "./browsing-page-monitor.js";
import { LockTimeMonitor } from "./lock-timing-monitor.js";

const kSelectTimeURL = chrome.runtime.getURL("select-time.html");
const kBlockPageURL = chrome.runtime.getURL("blocking.html");
const kOptionURL = chrome.runtime.getURL("options.html");


var activated = true;

chrome.runtime.onInstalled.addListener(function () {
  chrome.storage.sync.set({ activated: false }, function () {
    console.debug("Lock is activated");
  });
});

chrome.storage.sync.get("activated", function (data) {
  activated = data.activated;
  console.debug("Init activated: " + data.activated);
});

chrome.storage.onChanged.addListener(function (changes, namespace) {
  if (changes.activated != undefined) {
    activated = changes.activated.newValue;
    console.debug("background buffered activated changed: " + activated);
  }
});


let monitor = new BrowsingPageMonitor("browse-monitor");
let unlockTiming = new LockTimeMonitor("lock-time-monitor");

let blackList = ["bilibili.com", "youtube.com", "localhost"];
monitor.blackList.addList(blackList);

function blockTab(tab, hostname) {
  console.debug(`Blocking the tab of host: ${hostname}`);
  if (unlockTiming.isUnlocked(hostname)) {
    console.debug(`${hostname} is unlocked, does not block.`)
    return;
  }
  DynamicPageBackend.openOnNewTab(kSelectTimeURL, {blocked_link: hostname});
}

// monitor.onBrowse.addListener(blockTab);
monitor.onBrowse["addListener"](blockTab);

// monitor.active = false;
