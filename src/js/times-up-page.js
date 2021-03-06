/**
 * This is the js for blocking.html
 */
import { dynamicInit } from "./dynamic-page.js";
import { TabBlocker } from "./tab-blocker.js";
import { closeCurrentTab, setTextForClass, $id } from "./utility.js";
import "./common-page.js";
import { RemoteCallable } from "./remote-callable.js";

let blockedHost = undefined;

let closeAllBtn = $id("close-all-about");

dynamicInit(function (args) {
  blockedHost = args.blockedHost;

  setTextForClass("blocked-link", blockedHost);

  TabBlocker.autoUnblock(blockedHost);

  closeAllBtn.onclick = function () {
    // close all page about the hostname
    RemoteCallable.call("tab-blocker", "blockAllByClosing", [blockedHost]).then(
      function () {
        // Close time-selection and blocking page about the hostname
        TabBlocker.notifyUnblock(blockedHost);
        // Delay for a while before closing to avoid potential frequent tab switching
        window.setTimeout(closeCurrentTab, 200);
      }
    );
  };
});
