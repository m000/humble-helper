var manifest = browser.runtime.getManifest();
console.log(manifest.name + ": started");

// show the presence of the extension
document.body.style.border = "10px solid green";

// Function to copy game information from a dictionary to clipboard,
// in a format suitable for pasting into Excel.
function copyToClipboard(game_info) {
  var copied = "";
  var display_order = [
    "bundle", "display_order", "name", "selected", "steam", "drmfree",
    "genres", "platforms", "developers",
    "url_youtube", "url_steam", "msrp",
    "id",
  ];

  game_info.forEach(function(g, i) {
    display_order.forEach(function(k, j) {
        copied += g[k] + "\t";
    });
    copied += "\n";
  });

  navigator.clipboard.writeText(copied).then(function() {
    window.alert(manifest.name + ": data copied to clipboard.");
  }, function() {
    // dump to web console if clipboard failed
    window.alert(manifest.name + ": could not copy data to clipboard.");
    console.log(copied);
  });
}

// Bundle data are temporarily loaded in a script tag and then removed from DOM.
// Use an observer to intercept the removal.
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

      var all_info = JSON.parse(m.removedNodes[0].innerText)["contentChoiceOptions"];
      var games_info    = all_info.contentChoiceData.initial.content_choices;
      var display_order = all_info.contentChoiceData.initial.display_order;
      var bundle        = all_info.contentChoiceData.initial.title;
      var choices_made  = all_info.contentChoicesMade.initial.choices_made;
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

      // copy data to clipboard
      //console.log(choices_info_o);
      copyToClipboard(choices_info_o);

      // deregister once done
      observer.disconnect();
      console.log(manifest.name + ": done");
      break;
    }
  }
});

removal_observer.observe(document.body, { childList: true });


/*
// This function retrieves data about the bundle from the DOM after page has
// fully loaded. However not all data are directly accessible through HTML
// elements. For this, the function is not used.
function getHumbleMonthlyData() {
  var choices = document.querySelectorAll(".content-choice");
  var choices_info = [];
  choices.forEach(function(v, i) {
    var info = {
      "name": v.querySelector(".content-choice-title").innerText,
      "claimed": v.querySelector(".js-claimed-badge-container").innerText != "",
      "steam": v.querySelector(".delivery-methods .hb-steam") != null,
      "drmfree": v.querySelector(".delivery-methods .hb-drmfree") != null,
      "img": v.querySelector(".choice-image").getAttribute("src")
    };
    choices_info.push(info);
  });
  return choices_info;
}
*/

// vim: tabstop=2 shiftwidth=2 softtabstop=2 expandtab cursorline
