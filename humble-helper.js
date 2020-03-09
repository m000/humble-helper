// Set some convenience globals.
var manifest = browser.runtime.getManifest();
var extension_id = manifest.applications.gecko.id;
var display_order = [
  "bundle", "display_order", "name", "selected", "steam", "drmfree",
  "genres", "platforms", "developers",
  "url_youtube", "url_steam", "url_image",
  "msrp", "id",
];
var rawinfo = null;

// Function that extracts information from the raw info dump.
function parseRawInfo(rawinfo) {
  var games_info    = rawinfo.contentChoiceData.initial.content_choices;
  var display_order = rawinfo.contentChoiceData.initial.display_order;
  var bundle        = rawinfo.contentChoiceData.initial.title;
  var choices_made  = rawinfo.contentChoicesMade.initial.choices_made;
  var choices_info = {};

  for (var g in games_info) {
    // main game info and shorthands for long paths
    var gi = games_info[g];
    var ytl = gi.carousel_content["youtube-link"];
    var steamid = gi.tpkds[0]["steam_app_id"];

    // sort stuff
    gi.genres.sort();
    gi.platforms.sort();

    // assemble exported info dictionary
    var info = {
      "id": g,
      "bundle": bundle,
      "name": gi.title,
      "genres": gi.genres.join(", "),
      "platforms": gi.platforms.join(", "),
      "msrp": gi["msrp|money"].amount + gi["msrp|money"].currency,
      "developers": gi.developers.join(", "),
      "url_youtube": (ytl.length > 0) ? "https://youtu.be/" + ytl[0] : "",
      "url_steam": (steamid != "") ? "https://store.steampowered.com/app/" + steamid : "",
      "url_image": gi.image,
      "steam": gi.delivery_methods.includes("steam"),
      "drmfree": gi.delivery_methods.includes("download"),
      "selected": false,
      "display_order": -1
    };

    choices_info[g] = info;
  }

  // update selected games
  choices_made.forEach(function(g, i) {
    choices_info[g].selected = true;
  });

  // games in displayed order
  var choices_info_o = [];
  display_order.forEach(function(g, i) {
    choices_info[g].display_order = i+1;
    choices_info_o.push(choices_info[g]);
  });

	return choices_info_o;
}

// Function that converts raw info to TSV format.
function convertToTSV(rawinfo) {
  var info = parseRawInfo(rawinfo);
  var tsv = "";
  info.forEach(function(g, i) {
    display_order.forEach(function(k, j) {
        tsv += g[k] + "\t";
    });
    tsv += "\n";
  });
	return {"format": "TSV", "count": info.length, "data": tsv};
}

// Function that converts raw info to JSON format.
function convertToJSON(rawinfo) {
  var info = parseRawInfo(rawinfo);
	var json = JSON.stringify(info, null, 2);
	return {"format": "JSON", "count": info.length, "data": json};
}

// Function to copy game information from a dictionary to clipboard.
function copyToClipboard(contents) {
	var success = false;
  navigator.clipboard.writeText(contents).then(function() {
    success = true;
  }, function() {
    success = false;
    console.log(copied);
  });
	return success;
}




// show the presence of the extension
document.body.style.border = "10px solid rgb(151, 177, 71)";

// Observer used to intercept raw data from the DOM, before they are removed.
// Content script must be set to run at document_end.
const removal_observer = new MutationObserver(function(mutations, observer) {
  for(let m of mutations) {
    if (m.type === "childList" && m.removedNodes.length > 0) {
      if (m.removedNodes.length > 1) {
        window.alert(manifest.name + ": Unexpected removal of multiple DOM items.");
      }
      if (m.removedNodes[0].id != "webpack-monthly-product-data") {
        continue;
      }

			var parsed = JSON.parse(m.removedNodes[0].innerText);
			if ("contentChoiceOptions" in parsed) {
				rawinfo = parsed.contentChoiceOptions;
        observer.disconnect();
        console.log(manifest.name + ": raw info retrieved");
        break;
		  }
    }
  }
});

// register observer for DOM changes
console.log(manifest.name + ": waiting for raw info to appear");
removal_observer.observe(document.body, { childList: true });

// register listener for messages from page action script
browser.runtime.onMessage.addListener(function(message, sender, sendResponse) {
	var error = true;
	var response = "unknown";
  const valid_buttons = ["humble-helper-copy-tsv", "humble-helper-copy-json", "humble-helper-copy-html"];

  if (sender.id != extension_id) {
		response = "Received message from unknown sender: " + sender.id;
  } else if (!("humble_helper" in message)) {
		response = "Received invalid message.";
  } else if (!valid_buttons.includes(message.humble_helper)) {
		response = "Invalid request in message: " + message.humble_helper;
  } else if (rawinfo == null) {
		response = "No game information have been found.";
	} else {
    // all good - convert data
		var converted = null;
		if (message.humble_helper == "humble-helper-copy-tsv") {
			converted = convertToTSV(rawinfo);
		} else if (message.humble_helper == "humble-helper-copy-json") {
			converted = convertToJSON(rawinfo);
		} else {
			response = "Requested format not yet supported.";
		}

		// copy to clipboard
		if (converted != null) {
			error = copyToClipboard(converted.data);
			response = (error ? "Failed to copy" : "Copied") + ` ${converted.count} items in ${converted.format} format to clipboard.`;
		}
  }
  sendResponse({"error": error, "message": response});
});

// vim: tabstop=2 shiftwidth=2 softtabstop=2 expandtab cursorline
