import { CustomEventWrapper } from "./custom-event-wrapper.js";
import { HostnameSet } from "./hostname-set.js";
import { RemoteCallable } from "./remote-callable.js";

// Different hostname type
const HOST_TYPE = {
  UNKNOWN: 0,
  NORMAL: 1,
  IPV4: 4,
  IPV6: 6,
};
Object.freeze(HOST_TYPE);

const BROWSING_MONITORED_PAGE = "browsing-monitored-host";
const TAB_SWITCH_DELAY = 100;
const WINDOW_SWITCH_DELAY = 300;

/**
 * Used for monitoring browser user's browsing page.
 *
 * Client can define a list of hostname to be monitored.
 * When user start browsing a monitored hostname,
 * callback functions will be activated.
 */
class BrowsingPageMonitor extends RemoteCallable {
  #monitoredHost = new HostnameSet();
  #whitelistHost = new HostnameSet();
  #eventTarget = new EventTarget();
  #browseEvent = new CustomEventWrapper(
    BROWSING_MONITORED_PAGE,
    this.#eventTarget
  );
  #monitoring = true;
  #protocol =  new Set(["http:", "https:"]);

  constructor(name) {
    super(name);

    // make private member public
    let browseEvent = this.#browseEvent;
    // avoid ambiguity of "this"
    let monitor = this;

    let onBrowsingPageChanged = function (tab) {
      if (!tab || !tab.url) return;

      console.debug(`User are browsing: ${tab.url}`);

      let monitoredHost = monitor.isMonitoring(tab.url);
      if (monitoredHost == undefined) return;

      // Wait for a while, to allow the browser to complete tab switching
      // to reduce the effect of a weird bug
      window.setTimeout(function () {
        browseEvent.trigger(tab, monitoredHost);
      }, TAB_SWITCH_DELAY);
    };

    chrome.tabs.onUpdated.addListener(function (id, changes, tab) {
      if (!monitor.active || !tab.active || !changes.url) return;
      onBrowsingPageChanged(tab);
    });

    chrome.tabs.onActivated.addListener(function (tabInfo) {
      if (!monitor.active) return;
      chrome.tabs.get(tabInfo.tabId, onBrowsingPageChanged);
    });

    chrome.windows.onFocusChanged.addListener(function (winId) {
      if (!monitor.active || winId == chrome.windows.WINDOW_ID_NONE) return;
      window.setTimeout(function () {
        chrome.tabs.query({ active: true, windowId: winId }, function (tabs) {
          // If the all tabs are closed before query.
          if (tabs.length < 1) return;
          onBrowsingPageChanged(tabs[0]);
        });
      }, WINDOW_SWITCH_DELAY);
    });

    console.debug("Browsing monitor setup.");
  }

  /**
   * @return {Set<String>} the protocol that are monitored
   */
  get monitoredProtocol() {
    return this.#protocol;
  }

  /**
   * @returns {boolean} If the monitor is active
   */
  get active() {
    return this.#monitoring;
  }

  set active(val) {
    val = Boolean(val);
    this.#monitoring = val;
  }

  /**
   * Check if a web page is monitored.
   * @param {string} url the URL of web page to be checked.
   * @returns {(string|undefined)} the actual monitored host suffix if the web page is monitored.
   *    If the web page is not monitored, return undefined
   */
  isMonitoring(url) {
    if (!this.active) return undefined;
    let urlObj = new URL(url);
    if (!this.monitoredProtocol.has(urlObj.protocol)) return undefined;
    if (this.whitelist.has(urlObj.hostname)) return undefined;
    return this.blacklist.has(urlObj.hostname);
  }

  /**
   * Get a set of host name that are monitored.
   */
  get blacklist() {
    return this.#monitoredHost;
  }

  /**
   * Get a set of host name that are in the whitelist.
   */
  get whitelist() {
    return this.#whitelistHost;
  }

  /**
   * The event that will be triggered when user browse the host in blacklist.
   *
   * The callback function format for this event is:
   *
   *     function (tab: chrome.tabs.Tab, hostname: String)
   *  - tab: the tab that opened a monitored host
   *  - hostname: the monitored hostname
   */
  get onBrowse() {
    return this.#browseEvent;
  }
}

export { BrowsingPageMonitor };