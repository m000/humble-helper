// set some convenience globals
var manifest = browser.runtime.getManifest();
var page_action_icon_max = Math.max.apply(null, Object.keys(manifest.page_action.default_icon));
var page_action_icon = manifest.page_action.default_icon[page_action_icon_max];
var page_action_title = manifest.page_action.default_title;

// notifications wrapper
function doNotify(message, error=false) {
  browser.notifications.create({
    "type": "basic",
    "iconUrl": page_action_icon,
    "title": page_action_title,
    "message": (error ? "Error. " : "Success. ") + message
  });
}

// send a message to the content script to request copying data to clipboard
function requestDataCopy(what) {
	// browser.tabs.getCurrent() returns undefined because the page action is a popup.
	// Use browser.tabs.query() instead.
	browser.tabs.query({active:true, currentWindow:true}).then(function(tabs){
		browser.tabs.sendMessage(tabs[0].id, {"humble_helper": what}).then(
			function(resp) { doNotify(resp.message, error=resp.error); },
			function(err) { doNotify("Couldn't contact content script!", error=true); }
		);
	});
}

// register event listener for button clicks
document.querySelectorAll("#buttons > button").forEach(function(b, i) {
  b.addEventListener("click", function(ev) {
	const valid_buttons = ["humble-helper-copy-tsv", "humble-helper-copy-json", "humble-helper-copy-html"];
	if (valid_buttons.includes(ev.target.id)) {
		requestDataCopy(ev.target.id);
	} else {
      alert("Unknown button pressed: " + ev.target.id);
    }
  });
});

// vim: tabstop=2 shiftwidth=2 softtabstop=2 expandtab cursorline
