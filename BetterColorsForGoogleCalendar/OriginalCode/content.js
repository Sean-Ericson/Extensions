var DEBUG = false;

//init from storage
var colors = {}; //user's custom colors
colors['color'] = []
var eventColors = {}; //event -> color pairings
var recurringColorsRules = {}; //possible rules data structure
var page = 1; //1 = week, 2 = month (apparently week, day, 4 days have same box class, so all = 1), 3 = schedule, 4 = eventedit
var wait_init = 0;

//new global variable to toggle local storage
var local_storage = false;

var targetBox = "";
var targetBoxId = "";
var recurrentChoice = "";
var currentColor = null;

if (window.location.href.includes("day")) {
    page = 1;
} else if (window.location.href.includes("customweek")) {
    page = 2;
} else if (window.location.href.includes("week")) {
    page = 1;
} else if (window.location.href.includes("month")) {
    page = 2;
} else if (window.location.href.includes("agenda")) {
    page = 3;
} else if (window.location.href.includes("eventedit")) {
    page = 4;
} else {
    page = 1;
}

if (DEBUG) {
    console.log("href " + window.location.href);
    console.log("init page " + page);
}

//edit calendar color menu
document.addEventListener("contextmenu", function (evnt) {

    initColorMenu(evnt, 3);
});

//make sure every click syncs
document.addEventListener("click", function (evnt) {
    if (page == 4) {
        initColorMenu(evnt, 3);
        //colorAdvancedDetailsCircle(20);
    }

    setTimeout(checkExpand, 1, 20, evnt.target);
});

document.addEventListener("mousedown", function (evnt) {
    setTimeout(checkDrag, 1, 20);
});

//local storage setup
chrome.storage.local.get(null, function (items) {
    var allKeys = Object.keys(items);
    if (DEBUG) {
        console.log(allKeys);
    }

    if (allKeys.includes("localStorage")) {
        local_storage = items["localStorage"];
        if (DEBUG) {
            console.log("read local " + local_storage);
        }
    }
    else {
        local_storage = false;
        alert('More Colors for Calendar!\nNew Feature! Press the extension icon in your extension bar to open up a menu where you can now toggle to a local storage option. Previously, this extension ran entirely on cloud storage, but this limited each user to only 512 events with custom colors. Toggling to local storage mode gives you access to many more custom events (basically unlimited). However, this extension will lose the ability to sync your colors across browsers/computers. Choose whichever option is better for you.');
        chrome.storage.local.set({ "localStorage": local_storage }, function () {
            if (DEBUG) {
                console.log("set local storage to false, first time ever.");
            }
        });
    }

    retrieve_everything();
});

function inform_color_menu() {
    chrome.runtime.sendMessage({
        msg: "update_color_menu",
        data: colors
    });
}

//function to update deprecated storage structure
function fixOld(items) {
    if (DEBUG) {
        console.log("OLD DETECTED");
    }
    eventColors = items['eventColors'];
    colors['color'] = items['colors'];
    recurringColorsRules = items['recurrentRules'];
    if (local_storage) {
        chrome.storage.local.remove(['colors', 'eventColors', 'recurrentRules']);
    } else {
        chrome.storage.sync.remove(['colors', 'eventColors', 'recurrentRules']);
    }
    storageSync();
}

function retrieve_everything() {
    //clear everything.
    colors = {};
    colors['color'] = []
    eventColors = {};
    recurringColorsRules = {};

    wait_init = 0;

    function process_everything(items) {
        var allKeys = Object.keys(items);
        if (DEBUG) {
            console.log(allKeys);
        }

        if (allKeys.includes("eventColors")) {
            fixOld(items);
        }

        else {
            for (let i = 0; i < allKeys.length; i++) {
                if (allKeys[i] == 'color') {
                    colors['color'] = items[allKeys[i]];
                } else if (allKeys[i].length < 20) {
                    recurringColorsRules[allKeys[i]] = items[allKeys[i]];
                } else {
                    eventColors[allKeys[i]] = items[allKeys[i]];
                }
            }

            if (DEBUG) {
                console.log("retrieved from storage");
                console.log(eventColors);
                console.log(colors);
                console.log(recurringColorsRules);
            }

        }

        wait_init = 1;

        //perform recoloring after retrieving from storage
        //needed since toggle between local and cloud now
        startUp();

        //color menu should also update itself
        inform_color_menu();
    };

    if (local_storage) {
        if (DEBUG) {
            console.log("retrieving stuff from local");
        }
        chrome.storage.local.get(null, process_everything);
    } else {
        if (DEBUG) {
            console.log("retrieving stuff from cloud");
        }
        chrome.storage.sync.get(null, process_everything);

    }
}

//for popup menu to delete colors
//now also for popup menu to toggle local storage
chrome.runtime.onMessage.addListener(function (request, sender, callback) {
    if (DEBUG) {
        console.log(request);
    }

    if (request.req == "need color") {
        callback(colors);
    } else if (request.req == "delete color") {
        var color = request.color_del;

        var result = colors['color'].findIndex(item => color.toLowerCase() === item.toLowerCase());

        if (result != -1) {
            colors['color'].splice(result, 1);
            storageSyncColors();
        }
    } else if (request.req == "local storage") {
        if (DEBUG) {
            console.log("replying local? " + local_storage);
        }
        callback({ "local": local_storage });
    } else if (request.req == "local set") {
        local_storage = request.local;
        chrome.storage.local.set({ "localStorage": local_storage }, function () {
            if (DEBUG) {
                console.log("set local storage from toggle button to " + local_storage);
            }
        });
        retrieve_everything();
    }
});

//convert rgb to hex
function rgb2hex(rgb) {
    rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    function hex(x) {
        return ("0" + parseInt(x).toString(16)).slice(-2);
    }
    return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
}

//function to color one event
function colorEvent(event) {
    if (DEBUG) {
        console.log("performing default color event");
        console.log(event)
    }

    var event_id = event.getAttribute("data-eventid").substring(0, 25) + event.getAttribute("data-eventid").substring(45, 50);
    var eventDate;
    try {
        eventDate = event.children[0].innerHTML;
        if (eventDate.length == 0) {
            eventDate = event.children[1].innerHTML;
        }
    } catch (error) {
        return;
    }

    if (eventDate.length == 0) {
        try {
            eventDate = event.children[1].innerHTML;
        } catch (error) {
            return;
        }
    }

    var event_rules = recurringColorsRules[event_id.substring(0, 15)];
    var did_something = false;

    if (event_rules) {
        if (DEBUG) {
            console.log("FOUND A RULE");
            console.log(eventDate);
            console.log(event);
            console.log(event.children);
        }

        for (let i = 0; i < event_rules.length; i++) {

            var event_rule = event_rules[i];
            if (DEBUG) {
                console.log("this is my rule");
                console.log(event_rule);
            }

            if (compareDate(event_rule["date"], eventDate)) {
                if (!event_rule["done"].includes(event_id)) {

                    if (DEBUG) {
                        console.log("colored with rule: " + event_id);
                    }

                    if (event.getAttribute("class") == "ifwtOb elYzab-cXXICe-Hjleke NlL62b GHWQBd" || event.getAttribute("class") == "ifwtOb elYzab-cXXICe-Hjleke NlL62b") {
                        event.children[0].style["background-color"] = event_rule["color"];
                        event.style["border-color"] = event_rule["color"];
                    } else {
                        event.style["background-color"] = event_rule["color"];
                    }

                    eventColors[event_id] = event_rule["color"];
                    event_rule["done"].push(event_id);
                    did_something = true;
                }
            }
        }
    }

    if (did_something) {
        return;
    }

    if (!eventColors[event_id]) {

        if (DEBUG) {
            console.log("this eventid is not in eventcolors " + event_id)
        }

        if (event.getAttribute("class") == "ifwtOb elYzab-cXXICe-Hjleke NlL62b GHWQBd" || event.getAttribute("class") == "ifwtOb elYzab-cXXICe-Hjleke NlL62b") {
            if (event.style["border-color"].includes("rgb")) {
                eventColors[event_id] = rgb2hex(event.style["border-color"]);
            } else {
                eventColors[event_id] = event.style["border-color"];
            }
        } else {
            if (event.style["background-color"].includes("rgb")) {
                eventColors[event_id] = rgb2hex(event.style["background-color"]);
            } else {
                eventColors[event_id] = event.style["background-color"];
            }
        }

        if (DEBUG) {
            console.log('didnt find a color');
            console.log(event_id);
            console.log(eventColors[event_id]);
        }

    } else {

        if (event.getAttribute("class") == "ifwtOb elYzab-cXXICe-Hjleke NlL62b GHWQBd" || event.getAttribute("class") == "ifwtOb elYzab-cXXICe-Hjleke NlL62b") {
            event.children[0].style["background-color"] = eventColors[event_id];
            event.style["border-color"] = eventColors[event_id];
        } else {
            event.style["background-color"] = eventColors[event_id];
        }

        if (DEBUG) {
            console.log("found a color");
            console.log(event_id);
            console.log(eventColors[event_id]);
        }
    }
}

//function to color one event circle (month view)
function colorEventMonth(event) {
    if (DEBUG) {
        console.log("performing month color event");
        console.log(event)
    }

    var event_id = event.getAttribute("data-eventid").substring(0, 25) + event.getAttribute("data-eventid").substring(45, 50);
    var eventCircle;

    var eventSub = event.children[0];
    var eventSubColor = eventSub.style["background-color"];


    var eventDate;
    try {
        if (eventSubColor != "") {
            if (event.children.length == 2) {
                eventDate = event.children[1].children[1].innerHTML;
            } else {
                eventDate = event.children[0].children[1].innerHTML;
            }
        } else {
            eventDate = event.children[0].children[2].innerHTML;
        }
    } catch (error) {
        return;
    }

    if (eventSubColor == "") {
        eventCircle = event.children[0].children[0].children[0];
    }

    if (DEBUG) {
        console.log("coloring event id");
        console.log(event_id);
    }

    var event_rules = recurringColorsRules[event_id.substring(0, 15)];
    var did_something = false;

    if (event_rules) {
        if (DEBUG) {
            console.log(event);
            console.log(eventDate);
        }

        for (let i = 0; i < event_rules.length; i++) {

            var event_rule = event_rules[i];

            if (compareDate(event_rule["date"], eventDate)) {
                if (!event_rule["done"].includes(event_id)) {
                    if (eventSubColor != "") {
                        eventSub.style["background-color"] = event_rule["color"];
                        eventColors[event_id] = event_rule["color"];
                        event_rule["done"].push(event_id);
                        did_something = true;
                    } else {
                        eventCircle.style["border-color"] = event_rule["color"];
                        eventColors[event_id] = event_rule["color"];
                        event_rule["done"].push(event_id);
                        did_something = true;
                    }

                }
            }
        }
    }

    if (did_something) {
        return;
    }

    if (DEBUG) {
        console.log("MONTH");
        console.log("coloring event id");
        console.log(event_id);
        console.log(eventSubColor);
    }

    if (!eventColors[event_id]) {

        if (eventSubColor != "") {
            if (eventSubColor.includes("rgb")) {
                eventColors[event_id] = rgb2hex(eventSubColor);
            } else {
                eventColors[event_id] = eventSubColor;
            }
        } else if (eventCircle.style["border-color"].includes("rgb")) {
            eventColors[event_id] = rgb2hex(eventCircle.style["border-color"]);
        } else {
            eventColors[event_id] = eventCircle.style["border-color"];
        }

    } else {
        if (eventSubColor != "") {
            eventSub.style["background-color"] = eventColors[event_id];
        } else {
            eventCircle.style["border-color"] = eventColors[event_id];
        }
        if (DEBUG) {
            console.log("found a color");
            console.log(event_id);
            console.log(eventColors[event_id]);
        }
    }
}

//function to color one event circle (schedule view)
function colorEventSched(event) {
    if (DEBUG) {
        console.log("performing sched color event");
        console.log(event)
    }

    var event_id = event.getAttribute("data-eventid").substring(0, 25) + event.getAttribute("data-eventid").substring(45, 50);
    var eventCircle = event.children[2].children[0].children[0];

    var eventDate;
    try {
        eventDate = event.children[1].children[0].getAttribute("aria-label");
    } catch (error) {
        return;
    }

    var event_rules = recurringColorsRules[event_id.substring(0, 15)];
    var did_something = false;

    if (event_rules) {
        for (let i = 0; i < event_rules.length; i++) {

            var event_rule = event_rules[i];

            if (compareDate(event_rule["date"], eventDate)) {
                if (!event_rule["done"].includes(event_id)) {
                    eventCircle.style["border-color"] = event_rule["color"];
                    eventColors[event_id] = event_rule["color"];
                    event_rule["done"].push(event_id);
                    did_something = true;
                }
            }
        }
    }

    if (did_something) {
        return;
    }

    if (!eventColors[event_id]) {

        if (eventCircle.style["border-color"].includes("rgb")) {
            eventColors[event_id] = rgb2hex(eventCircle.style["border-color"]);
        } else {
            eventColors[event_id] = eventCircle.style["border-color"];
        }

    } else {
        eventCircle.style["border-color"] = eventColors[event_id];
        if (DEBUG) {
            console.log("found a color");
            console.log(event_id);
            console.log(eventColors[event_id]);
        }
    }
}

//function to color events
function colorEvents(count) {
    if (count == 0) {
        return;
    }

    var array1 = Array.prototype.slice.call(document.getElementsByClassName("NlL62b EfQccc elYzab-cXXICe-Hjleke  EiZ8Dd afiDFd"), 0);
    var array2 = Array.prototype.slice.call(document.getElementsByClassName("ifwtOb elYzab-cXXICe-Hjleke NlL62b GHWQBd"), 0);
    var array3 = Array.prototype.slice.call(document.getElementsByClassName("NlL62b EfQccc elYzab-cXXICe-Hjleke EiZ8Dd"), 0);
    var array4 = Array.prototype.slice.call(document.getElementsByClassName("ifwtOb elYzab-cXXICe-Hjleke NlL62b"), 0);

    var events = array1.concat(array2.concat(array3.concat(array4)));

    var events2 = document.getElementsByClassName("ifwtOb elYzab-cXXICe-Hjleke NlL62b xHTz8b");
    var events3 = document.getElementsByClassName("dtaVuc OY8yJd");

    if ((page == 1 && (events.length == 0 || typeof events[0] == "undefined")) && (page == 2 && (events2.length == 0 || typeof events2[0] == "undefined"))
        && (page == 3 && (events3.length == 0 || typeof events3[0] == "undefined"))) {

        setTimeout(colorEvents, 50, count - 1);
        return;
    }

    if (DEBUG) {
        console.log("colorEvents");
        console.log("page? " + page);
    }

    if (page == 1) {
        for (let i = 0; i < events.length; i++) {
            if (!events[i].getAttribute("data-eventid")) {
                continue;
            }
            colorEvent(events[i]);
        }
    } else if (page == 2) {
        for (let i = 0; i < events2.length; i++) {
            if (!events2[i].getAttribute("data-eventid")) {
                continue;
            }
            colorEventMonth(events2[i]);
        }
    } else if (page == 3) {
        for (let i = 0; i < events3.length; i++) {
            if (!events3[i].getAttribute("data-eventid")) {
                continue;
            }
            colorEventSched(events3[i]);
        }
    }
}

//init color menu
function initColorMenu(evnt, count) {
    if (count == 0) {
        return;
    }

    if (document.getElementById("colorSelector")) {
        if (DEBUG) {
            console.log("color selector stopping initcolormenu..");
        }
        setTimeout(initColorMenu, 50, evnt, count - 1);
        return;
    }

    if (DEBUG) {
        console.log("init color menu!");
    }

    targetBox = evnt.target;

    while (targetBox && targetBox.tagName != 'HTML' && !(targetBox.getAttribute("data-eventid") && targetBox.style["border-color"]) && !(page == 3 && targetBox.getAttribute("data-keyboardactiontype"))) {
        targetBox = targetBox.parentNode;
    }

    if (page == 4) {
        var temp_id = window.location.href.substring(window.location.href.lastIndexOf("/") + 1);
        targetBoxId = temp_id.substring(0, 25) + temp_id.substring(45, 50);
    }

    if (targetBox && targetBox.getAttribute("data-eventid") != null) {
        targetBoxId = targetBox.getAttribute("data-eventid").substring(0, 25) + targetBox.getAttribute("data-eventid").substring(45, 50);
    }

    if (DEBUG) {
        console.log("target box in initcolormenu");
        console.log(targetBox);
    }

    generateMenu(evnt, 150);
    newSelector(20);
    generateCheckMark(evnt, 20);
    checkDelete(20);
}

//check user deletes event
function checkDelete(count) {
    if (count == 0) {
        return;
    }

    var x = document.getElementsByClassName("JPdR6b e5Emjc kydeve e6NAn");

    if (x.length == 0 || typeof x[0] == "undefined") {
        setTimeout(checkDelete, 20, count - 1);
        return;
    }

    x[0].addEventListener("click", function (evnt) {
        var target = evnt.target;
        if (target == null) {
            return;
        }

        while (!target.getAttribute("jsaction")) {
            target = target.parentNode;

            if (target == null) {
                return;
            }
        }

        if (target.getAttribute("class").includes("z80M1 PeCuse")) {

            recurringEvent(20, "delete");

            var z = setInterval(function () {

                if (document.getElementsByClassName("VYTiVb").length > 0 && document.getElementsByClassName("VYTiVb")[0].innerHTML.includes("deleted")) {
                    //var targetBoxId = targetBox.getAttribute("data-eventid").substring(0, 25) + targetBox.getAttribute("data-eventid").substring(45, 50);



                    if (document.getElementsByClassName("I7OXgf dT3uCc gF3fI fNxzgd Inn9w iWO5td").length == 0) {
                        delete eventColors[targetBoxId];
                    }

                    if (DEBUG) {
                        console.log("removed an event color " + targetBoxId);
                    }

                    clearInterval(z);

                }
            }, 250);

            setTimeout(function () { clearInterval(z) }, 10000);
        }
    });
}

//user selected a custom color
function customColorSelected(evnt, advanced) {
    if (DEBUG) {
        console.log("custom color selected!!!");
        console.log(evnt);
    }

    var selectedCircle;

    if (!advanced) {
        selectedCircle = evnt.target.parentNode;
    } else {
        selectedCircle = { 'style': { 'background-color': advanced } };
    }

    if (DEBUG) {
        console.log("selected circle");
        console.log(selectedCircle);
        console.log(selectedCircle.style['background-color']);
    }

    // if (document.getElementsByClassName("I7OXgf dT3uCc gF3fI fNxzgd Inn9w iWO5td").length > 0) {
    // 	return;
    // }
    //targetBox.style["background-color"] = selectedCircle.style["background-color"];
    //var targetBoxId = targetBox.getAttribute("data-eventid").substring(0, 25) + targetBox.getAttribute("data-eventid").substring(45, 50);
    //var x = document.getElementsByClassName("I7OXgf dT3uCc gF3fI fNxzgd Inn9w iWO5td");

    if (selectedCircle.style["background-color"].includes("rgb")) {
        eventColors[targetBoxId] = rgb2hex(selectedCircle.style["background-color"]);
    } else {
        eventColors[targetBoxId] = selectedCircle.style["background-color"];
    }

    // if (builtin) {
    // 	targetBox.style["background-color"] = selectedCircle.style["background-color"];
    // }
    //var x = document.getElementsByClassName("I7OXgf dT3uCc gF3fI fNxzgd Inn9w iWO5td");

    if (DEBUG) {
        console.log("new color set");
    }

    if (document.getElementsByClassName("I7OXgf dT3uCc gF3fI fNxzgd Inn9w iWO5td").length == 0) {
        setTimeout(colorEvents, 30, 20);
    }

    storageSync();
}

//sync colors (ONLY) to storage
function storageSyncColors() {
    if (local_storage) {
        chrome.storage.local.set(colors, function () {
            if (DEBUG) {
                console.log('colors is set in local to ');
                console.log(colors);
            }
        });
    } else {
        chrome.storage.sync.set(colors, function () {
            if (DEBUG) {
                console.log('colors is set in cloud to ');
                console.log(colors);
            }
        });
    }
}

//sync current colors and eventcolors and recurrent rules to storage
function storageSync() {
    if (DEBUG) {
        console.log("STORAGE SYNCING");
    }

    //console.log("eventColors");
    //console.log(eventColors);

    if (local_storage) {
        chrome.storage.local.set(eventColors, function () {
            if (DEBUG) {
                console.log('eventColors is set in local to ');
                console.log(eventColors);
            }
            wait_init = 1;
        });

        chrome.storage.local.set(colors, function () {
            if (DEBUG) {
                console.log('colors is set in local to ');
                console.log(colors);
            }
        });

        chrome.storage.local.set(recurringColorsRules, function () {
            if (DEBUG) {
                console.log('recurrentrules is set in local to ');
                console.log(recurringColorsRules);
            }
        });

    } else {
        chrome.storage.sync.set(eventColors, function () {
            if (DEBUG) {
                console.log('eventColors is set in cloud to ');
                console.log(eventColors);
            }
            wait_init = 1;
        });

        chrome.storage.sync.set(colors, function () {
            if (DEBUG) {
                console.log('colors is set in cloud to ');
                console.log(colors);
            }
        });

        chrome.storage.sync.set(recurringColorsRules, function () {
            if (DEBUG) {
                console.log('recurrentrules is set in cloud to ');
                console.log(recurringColorsRules);
            }
        });
    }
}

//do the check mark thing
function generateCheckMark(count) {
    if (count == 0) {
        return;
    }

    if (!document.getElementById("colorSelector")) {
        setTimeout(generateCheckMark, 30, count - 1);
        return;
    }

    var x = document.getElementsByClassName("XdW1Wc");

    if (x.length == 0 || typeof x[0] == "undefined") {
        setTimeout(generateCheckMark, 30, count - 1);
        return;
    }

    x = x[0].children[0];

    if (DEBUG) {
        console.log("within generate checkmark");
        console.log(x);
    }

    for (let i = 0; i < x.children.length; i++) {

        var a = x.children[i];

        for (let k = 0; k < a.children.length; k++) {
            var circle = a.children[k];

            var circleColor = circle.style["background-color"];

            if (circleColor.includes("rgb")) {
                circleColor = rgb2hex(circleColor);
            }

            var color_match;
            if (page == 4) {
                color_match = currentColor;
            } else {
                color_match = eventColors[targetBoxId];
            }

            if (DEBUG) {
                console.log('color_match ' + color_match);
            }

            if (circleColor == color_match) {
                circle.children[0].setAttribute("class", "DPvwYc Nh4qkc M8B6kc eO2Zfd");
            } else {
                circle.children[0].setAttribute("class", "DPvwYc Nh4qkc M8B6kc");
            }
            if (parseInt(circle.getAttribute("data-color-index"), 10) < 1000) {
                circle.addEventListener("click", function (evnt) {
                    //console.log(circle);
                    if (page == 4) {
                        advancedColorSelected(evnt, "color-builtin");
                    } else {
                        setTimeout(customColorSelected, 50, evnt);
                        setTimeout(recurringEvent, 100, 25, "color-builtin");
                    }
                    //setTimeout(customColorSelected, 50, evnt, true);
                    // setTimeout(recurringEvent, 100, 25, "color-builtin");
                });
            }
        }
    }
}

//delete rules if built in overrides
function deleteRules() {
    var date;

    if (page == 1) {
        date = targetBox.children[0].innerHTML;
        if (date.length == 0) {
            date = targetBox.children[1].innerHTML;
        }
    } else if (page == 2) {

        if (targetBox.children[0].style["background-color"]) {
            if (targetBox.children.length == 2) {
                date = targetBox.children[1].children[1].innerHTML;
            } else {
                date = targetBox.children[0].children[1].innerHTML;
            }
        } else {
            date = targetBox.children[0].children[2].innerHTML;
        }

    } else {
        date = targetBox.children[1].children[0].getAttribute("aria-label");
    }

    var targetGroupId = targetBox.getAttribute("data-eventid").substring(0, 15);

    var rules = recurringColorsRules[targetGroupId];

    if (recurrentChoice == "2") {
        for (let i = rules.length - 2; i >= 0; i--) {
            if (compareDate(date, rules[i]["date"])) {
                rules.splice(i, 1);
            }
        }

        recurringColorsRules[targetGroupId] = rules;

    } else if (recurrentChoice == "3") {
        recurringColorsRules[targetGroupId] = [recurringColorsRules[targetGroupId].pop()];
    }

    if (DEBUG) {
        console.log("rules deleted for group: " + targetGroupId);
    }
}

//TODO: set hover label of color circles
function getSemanticName(color) {
    if (DEBUG) {
        console.log("todo: need to set a semantic name");
    }
    return "Custom Color";
}

//generate menu w/ custom colors
function generateMenu(evnt, count) {

    if (count == 0) {
        return;
    }

    var x = document.getElementsByClassName("XdW1Wc");
    var y = document.getElementById("colorSelector");
    var z = document.getElementById("button" + colors['color'][colors['color'].length - 1]);

    if (x.length == 0 || typeof x[0] == "undefined" || y || z) {
        setTimeout(generateMenu, 5, evnt, count - 1);
        return;
    }

    if (DEBUG) {
        console.log("found the color menu!");
        console.log(x.length);
        console.log(typeof x[0]);
    }

    x = x[0].children[0]

    var nodeCopy = x.children[0].children[0];
    var bottomRow = x.children[x.children.length - 1];

    if (typeof bottomRow == 'undefined') {
        return;
    }

    var idx = 0;
    var colors_per_row;
    if (page == 4) {
        colors_per_row = 2;
    } else {
        colors_per_row = 6;
    }

    var color_list = colors['color'];

    while (idx < color_list.length) {
        if (bottomRow.children.length < colors_per_row) {
            if (DEBUG) {
                console.log("adding circle");
            }

            var colorCircle = nodeCopy.cloneNode(true);
            colorCircle.setAttribute("data-color-index", 1000 + idx);
            colorCircle.setAttribute("data-color", color_list[idx]);
            colorCircle.setAttribute("style", "background-color: " + color_list[idx]);
            colorCircle.setAttribute("id", "button" + color_list[idx]);
            colorCircle.children[1].setAttribute("data-text", getSemanticName(color_list[idx]));

            colorCircle.addEventListener("click", function (evnt) {
                if (DEBUG) {
                    console.log("custom circle clicked");
                    console.log(colorCircle);
                }
                if (page == 4) {
                    advancedColorSelected(evnt, "color");
                } else {
                    setTimeout(customColorSelected, 50, evnt);
                    setTimeout(recurringEvent, 100, 25, "color");
                }
            });

            bottomRow.appendChild(colorCircle);
            idx++;
        } else {
            bottomRow = bottomRow.parentNode.appendChild(bottomRow.cloneNode(false));
        }
    }
}

//generate new selector circle
function newSelector(count) {
    if (count == 0) {
        return;
    }

    var x = document.getElementsByClassName("XdW1Wc");
    var y = document.getElementById("colorSelector");

    var colors_per_row;
    if (page == 4) {
        colors_per_row = 2;
    } else {
        colors_per_row = 6;
    }

    if (x.length == 0 || y) {
        setTimeout(newSelector, 50, count - 1);
        return;
    }

    x = x[0].children[0];

    var nodeCopy = x.children[0].lastChild;
    var bottomRow = x.children[x.children.length - 1];

    if (typeof bottomRow == 'undefined') {
        return;
    }

    if (bottomRow.children.length == colors_per_row) {
        bottomRow = bottomRow.parentNode.appendChild(bottomRow.cloneNode(false));
    }

    var newColorCircle = nodeCopy.cloneNode(true);
    if (DEBUG) {
        console.log(newColorCircle);
    }

    newColorCircle.id = "colorSelector";
    newColorCircle.setAttribute("data-color-index", "-1");
    newColorCircle.setAttribute("style", "background-color: #BFBBDC");
    //newColorCircle.setAttribute("class", "myButton");

    newColorCircle.addEventListener("click", function (evnt) {
        openColorSelector(evnt);
    });

    if (DEBUG) {
        console.log(newColorCircle.children);
    }

    newColorCircle.removeAttribute("jsaction");
    newColorCircle.removeAttribute("jsname");

    newColorCircle.children[0].innerHTML = "+";
    newColorCircle.children[0].setAttribute("aria-hidden", "false");
    newColorCircle.children[0].style.opacity = 1;
    newColorCircle.children[1].setAttribute("aria-hidden", "false");
    var newColorButton = newColorCircle.children[1];

    newColorButton.setAttribute("class", "myButton");
    //newColorButton.removeAttribute("jscontroller");
    //newColorButton.removeAttribute("jsaction");

    bottomRow.appendChild(newColorCircle);
}

function isAlphaNumeric(str) {
    var code, i, len;

    for (i = 0, len = str.length; i < len; i++) {
        code = str.charCodeAt(i);
        if (!(code > 47 && code < 58) && // numeric (0-9)
            !(code > 64 && code < 71) && // upper alpha (A-Z)
            !(code > 96 && code < 103)) { // lower alpha (a-z)
            return false;
        }
    }
    return true;
}

//select a new color
function openColorSelector(evnt) {
    var color = prompt("Enter color hexcode (without # sign):");

    if (!color || color.length != 6 || !isAlphaNumeric(color) || colors['color'].includes("#" + color)) {
        alert("Please enter a valid 6 character hexcode that is not already in the menu.");
        return;
    }

    if (color) {
        colors['color'].push("#" + color);

        var x = document.getElementsByClassName("XdW1Wc");
        x = x[0].children[0]
        var nodeCopy = x.children[0].children[0];
        var bottomRow = x.children[x.children.length - 1];

        bottomRow.removeChild(bottomRow.lastChild);

        var colorCircle = nodeCopy.cloneNode(true);
        colorCircle.setAttribute("data-color-index", 1000 + colors['color'].length - 1);
        colorCircle.setAttribute("data-color", colors['color'][colors['color'].length - 1]);
        colorCircle.setAttribute("style", "background-color: " + colors['color'][colors['color'].length - 1]);
        colorCircle.setAttribute("id", "button" + colors['color'][colors['color'].length - 1]);
        colorCircle.children[1].setAttribute("data-text", getSemanticName(colors['color'][colors['color'].length - 1]));

        colorCircle.addEventListener("click", function (evnt) {
            if (DEBUG) {
                console.log("color circle clicked");
                console.log(colorCircle);
            }
            if (page == 4) {
                advancedColorSelected(evnt, "color");
            } else {
                setTimeout(customColorSelected, 50, evnt);
                setTimeout(recurringEvent, 100, 25, "color");
            }
            // setTimeout(customColorSelected, 50, evnt);
            // setTimeout(recurringEvent, 100, 25, "color");
        });

        bottomRow.appendChild(colorCircle);
        newSelector(20);
    }

    setTimeout(colorEvents, 100, 10);
    storageSync();
}

//check for expand dialog
function checkExpand(count, target) {
    if (count == 0) {
        return;
    }
    if (document.getElementsByClassName("jefcFd").length == 0) {
        setTimeout(checkExpand, 10, count - 1, target);
        return;
    }

    colorEvents(20);

    while (target.tagName != 'HTML' && !(target.getAttribute("data-eventid") && target.style["border-color"]) && !(page == 3 && target.getAttribute("data-keyboardactiontype"))) {
        target = target.parentNode;
    }

    if (target != null && target.getAttribute("data-eventid") != null) {
        var targetId = target.getAttribute("data-eventid").substring(0, 25) + target.getAttribute("data-eventid").substring(45, 50);
        var targetColor = eventColors[targetId];

        var square = document.getElementsByClassName("T7dzVe")[0];
        square.style['background-color'] = targetColor;
    }

    var x = setInterval(function () {
        if (document.getElementsByClassName("jefcFd").length == 0) {
            colorEvents(20);
            clearInterval(x);
        }
    }, 50);

    setTimeout(function () { clearInterval(x) }, 30000);
    setTimeout(colorEvents, 25, 20);
    setTimeout(colorEvents, 50, 20);
    setTimeout(colorEvents, 100, 20);
}

//look for dragged event
function checkDrag(count) {
    if (count == 0) {
        return;
    }
    if (document.getElementsByClassName("NlL62b EfQccc elYzab-cXXICe-Hjleke  EiZ8Dd Sb44q afiDFd").length == 0) {
        setTimeout(checkDrag, 10, count - 1);
        return;
    }

    if (DEBUG) {
        console.log("drag detected");
    }

    var x = setInterval(function () {
        if (document.getElementsByClassName("NlL62b EfQccc elYzab-cXXICe-Hjleke  EiZ8Dd Sb44q afiDFd").length == 0) {

            setTimeout(checkDragRecurring, 20, 10);

            setTimeout(colorEvents, 50, 20);
            clearInterval(x);
        }
    }, 200);

    setTimeout(function () { clearInterval(x) }, 10000);

    var z = setInterval(function () {

        if (document.getElementsByClassName("VYTiVb").length > 0 && document.getElementsByClassName("VYTiVb")[0].innerHTML.includes("Event saved")) {

            if (DEBUG) {
                console.log("drag finish, saved, detected");
            }
            colorEvents(20);
            setTimeout(colorEvents, 100, 20);
            setTimeout(colorEvents, 400, 20);
            clearInterval(z);
        }
    }, 100);

    setTimeout(function () { clearInterval(z) }, 5000);

    var y = setInterval(function () {

        if (document.getElementsByClassName("VYTiVb").length > 0 && document.getElementsByClassName("VYTiVb")[0].innerHTML.includes("Saving")) {
            if (DEBUG) {
                console.log("drag finish, saving, detected");
            }
            colorEvents(20);
            setTimeout(colorEvents, 50, 20);
            clearInterval(y);
        }
    }, 100);

    setTimeout(function () { clearInterval(y) }, 5000);
    colorEvents(20);
}

//look for recurring dragged event
function checkDragRecurring(count) {
    if (count == 0) {
        return;
    }

    if (document.getElementsByClassName("I7OXgf dT3uCc gF3fI fNxzgd Inn9w iWO5td").length == 0) {
        setTimeout(checkDragRecurring, 20, count - 1);
        return;
    }

    var x = setInterval(function () {

        if (document.getElementsByClassName("VYTiVb").length > 0 && document.getElementsByClassName("VYTiVb")[0].innerHTML.includes("Event saved")) {
            if (DEBUG) {
                console.log("drag finish, saved, detected");
            }
            colorEvents(20);
            clearInterval(x);
        }
    }, 100);

    setTimeout(function () { clearInterval(x) }, 5000);

    var y = setInterval(function () {

        if (document.getElementsByClassName("VYTiVb").length > 0 && document.getElementsByClassName("VYTiVb")[0].innerHTML.includes("Saving")) {
            if (DEBUG) {
                console.log("drag finish, saving, detected");
            }
            colorEvents(20);
            clearInterval(y);
        }
    }, 100);

    setTimeout(function () { clearInterval(y) }, 5000);

    var z = setInterval(function () {

        if (document.getElementsByClassName("I7OXgf dT3uCc gF3fI fNxzgd Inn9w iWO5td").length == 0) {
            if (DEBUG) {
                console.log("drag finish detected");
            }
            colorEvents(20);
            clearInterval(z);
        }
    }, 200);

    setTimeout(function () { clearInterval(z) }, 10000);
    colorEvents(20);
}

//look for recurring event prompt
function recurringEvent(count, action) {
    if (DEBUG) {
        console.log("RECURRING EVENT");
        console.log(action + " " + count);
    }

    if (count == 0) {
        return;
    }

    var x = document.getElementsByClassName("I7OXgf dT3uCc gF3fI fNxzgd Inn9w iWO5td");

    ////console.log(x);
    var buttons;

    try {
        //work with the all event selection
        buttons = document.getElementsByClassName("n0bXQ")[0].children[0];
    } catch {
        buttons = "not found";
    }

    if (x.length == 0 || typeof x[0] == "undefined" || buttons == "not found" || typeof buttons == "undefined") {
        setTimeout(recurringEvent, 30, count - 1, action);
        return;
    }

    recurrentChoice = "1";

    //if only 2 choices, there's no "this and all following"
    if (buttons.children.length < 3) {
        if (DEBUG) {
            console.log("only 2 choices, this and all");
        }
        buttons.children[0].addEventListener("click", function (evnt) {
            if (DEBUG) {
                console.log("detected click 1");
            }
            recurrentChoice = "1";
        });
        buttons.children[1].addEventListener("click", function (evnt) {
            if (DEBUG) {
                console.log("detected click 3");
            }
            recurrentChoice = "3";
        });
    } else {
        buttons.children[0].addEventListener("click", function (evnt) {
            if (DEBUG) {
                console.log("detected click 1");
            }
            recurrentChoice = "1";
        });

        buttons.children[1].addEventListener("click", function (evnt) {
            if (DEBUG) {
                console.log("detected click 2");
            }
            recurrentChoice = "2";
        });

        buttons.children[2].addEventListener("click", function (evnt) {
            if (DEBUG) {
                console.log("detected click 3");
            }
            recurrentChoice = "3";
        });
    }

    // ok_button.addEventListener("click", function(evnt) {
    // 	//console.log("ok button clicked");
    // 	setTimeout(colorRecurring, 50);
    // });

    if (DEBUG) {
        console.log("recurring event pressed detection");
        console.log(x[0]);
    }

    x[0].addEventListener("click", function (evnt) {

        var target = evnt.target;

        ////console.log(target.getAttribute("jsaction"));

        while (!target.getAttribute("jsaction")) {
            target = target.parentNode;
        }

        if (DEBUG) {
            console.log("OK PRESSED");
            console.log(target.getAttribute("class"));
        }

        if (target.getAttribute("class") == "uArJ5e UQuaGc kCyAyd l3F1ye ARrCac HvOprf evJWRb qs41qe M9Bg4d" || target.getAttribute("class") == "uArJ5e UQuaGc kCyAyd l3F1ye ARrCac HvOprf evJWRb M9Bg4d qs41qe") {
            if (action == "color") {
                setTimeout(colorRecurring, 50);
            } else if (action == "delete") {
                setTimeout(deleteRecurring, 50);
            } else if (action == "color-builtin") {
                setTimeout(colorRecurring, 50);
                setTimeout(deleteRules, 800);
            } else if (action == "advanced-color") {
                setTimeout(colorAdvanced, 50, 20);
            }
        } else {
            if (DEBUG) {
                console.log("uhoh .");
            }
        }
    });

    // document.addEventListener("click", function(evnt) {
    // 	//console.log(evnt);
    // });
    ////console.log(ok_button);
    ////console.log(buttons);
}

//delete recurring events based on user option
function deleteRecurring() {
    if (DEBUG) {
        console.log("recurrentChoice " + recurrentChoice + " deleting");
    }

    var array1 = Array.prototype.slice.call(document.getElementsByClassName("NlL62b EfQccc elYzab-cXXICe-Hjleke  EiZ8Dd afiDFd"), 0);
    var array2 = Array.prototype.slice.call(document.getElementsByClassName("ifwtOb elYzab-cXXICe-Hjleke NlL62b GHWQBd"), 0);
    var array3 = Array.prototype.slice.call(document.getElementsByClassName("NlL62b EfQccc elYzab-cXXICe-Hjleke EiZ8Dd"), 0);
    var array4 = Array.prototype.slice.call(document.getElementsByClassName("ifwtOb elYzab-cXXICe-Hjleke NlL62b"), 0);

    var events = array1.concat(array2.concat(array3.concat(array4)));
    var events2 = document.getElementsByClassName("ifwtOb elYzab-cXXICe-Hjleke NlL62b xHTz8b");
    var events3 = document.getElementsByClassName("dtaVuc OY8yJd");

    if (recurrentChoice == "1") {
        try {
            if (DEBUG) {
                console.log("recurr choice 1: removed an event color " + targetBoxId);
            }
            delete eventColors[targetBoxId];
        } catch (error) {
            if (DEBUG) {
                console.log("recurr choice 1: removing color threw exception (probably doesn't exist)");
            }
        }
    }

    if (recurrentChoice == "2") {
        var date;

        if (page == 1) {
            date = targetBox.children[0].innerHTML;
            if (date.length == 0) {
                date = targetBox.children[1].innerHTML;
            }
        } else if (page == 2) {

            if (targetBox.children[0].style["background-color"]) {
                if (targetBox.children.length == 2) {
                    date = targetBox.children[1].children[1].innerHTML;
                } else {
                    date = targetBox.children[0].children[1].innerHTML;
                }

            } else {
                date = targetBox.children[0].children[2].innerHTML;
            }

            events = events2;
        } else {
            date = targetBox.children[1].children[0].getAttribute("aria-label");
            events = events3;
        }

        for (let i = 0; i < events.length; i++) {
            if (!events[i].getAttribute("data-eventid")) {
                continue;
            }

            var eventDate;

            if (page == 1) {
                try {
                    eventDate = events[i].children[0].innerHTML;
                    if (eventDate.length == 0) {
                        eventDate = events[i].children[1].innerHTML;
                    }
                } catch (error) {
                    continue;
                }
            } else if (page == 2) {
                try {
                    if (events[i].children[0].style["background-color"]) {
                        if (targetBox.children.length == 2) {
                            eventDate = targetBox.children[1].children[1].innerHTML;
                        } else {
                            eventDate = targetBox.children[0].children[1].innerHTML;
                        }

                    } else {
                        eventDate = targetBox.children[0].children[2].innerHTML;
                    }
                } catch (error) {
                    continue;
                }
            } else {
                try {
                    eventDate = events[i].children[1].children[0].getAttribute("aria-label");
                } catch (error) {
                    continue;
                }

            }

            var eventId = events[i].getAttribute("data-eventid").substring(0, 25) + events[i].getAttribute("data-eventid").substring(45, 50);

            if (events[i].getAttribute("data-eventid").substring(0, 15) == targetBox.getAttribute("data-eventid").substring(0, 15) && compareDate(date, eventDate)) {
                try {
                    if (DEBUG) {
                        console.log("recurr choice 2: removed an event color " + eventId);
                    }
                    delete eventColors[eventId];
                } catch (error) {
                    if (DEBUG) {
                        console.log("recurr choice 2: removing color threw exception (probably doesn't exist)");
                    }
                }
            }
        }
    }

    if (recurrentChoice == "3") {

        if (page == 1) {

        } else if (page == 2) {
            events = events2;
        } else {
            events = events3;
        }

        for (let i = 0; i < events.length; i++) {

            if (!events[i].getAttribute("data-eventid")) {
                continue;
            }

            var eventId = events[i].getAttribute("data-eventid").substring(0, 25) + events[i].getAttribute("data-eventid").substring(45, 50);

            if (events[i].getAttribute("data-eventid").substring(0, 15) == targetBox.getAttribute("data-eventid").substring(0, 15)) {
                try {
                    if (DEBUG) {
                        console.log("recurr choice 3: removed an event color " + eventId);
                    }
                    delete eventColors[eventId];
                } catch (error) {
                    if (DEBUG) {
                        console.log("recurr choice 3: removing color threw exception (probably doesn't exist)");
                    }
                }
            }
        }
    }
}

//advanced wait for correct target box
function getTargetBox(targetBoxId) {

    var array1 = Array.prototype.slice.call(document.getElementsByClassName("NlL62b EfQccc elYzab-cXXICe-Hjleke  EiZ8Dd afiDFd"), 0);
    var array2 = Array.prototype.slice.call(document.getElementsByClassName("ifwtOb elYzab-cXXICe-Hjleke NlL62b GHWQBd"), 0);
    var array3 = Array.prototype.slice.call(document.getElementsByClassName("NlL62b EfQccc elYzab-cXXICe-Hjleke EiZ8Dd"), 0);
    var array4 = Array.prototype.slice.call(document.getElementsByClassName("ifwtOb elYzab-cXXICe-Hjleke NlL62b"), 0);

    var events = array1.concat(array2.concat(array3.concat(array4)));
    var events2 = document.getElementsByClassName("ifwtOb elYzab-cXXICe-Hjleke NlL62b xHTz8b");
    var events3 = document.getElementsByClassName("dtaVuc OY8yJd");

    if (page == 2) {
        events = events2;
    } else if (page == 3) {
        events = events3;
    }

    for (let i = 0; i < events.length; i++) {
        if (events[i].getAttribute("data-eventid").substring(0, 25) + events[i].getAttribute("data-eventid").substring(45, 50) == targetBoxId) {
            return events[i]
        }
    }
}

//color recurring events based on user option
function colorRecurring(advanced) {
    if (DEBUG) {
        console.log("COLOR RECURRING");
        console.log("recurrentChoice " + recurrentChoice + " coloring");
    }

    var array1 = Array.prototype.slice.call(document.getElementsByClassName("NlL62b EfQccc elYzab-cXXICe-Hjleke  EiZ8Dd afiDFd"), 0);
    var array2 = Array.prototype.slice.call(document.getElementsByClassName("ifwtOb elYzab-cXXICe-Hjleke NlL62b GHWQBd"), 0);
    var array3 = Array.prototype.slice.call(document.getElementsByClassName("NlL62b EfQccc elYzab-cXXICe-Hjleke EiZ8Dd"), 0);
    var array4 = Array.prototype.slice.call(document.getElementsByClassName("ifwtOb elYzab-cXXICe-Hjleke NlL62b"), 0);

    var events = array1.concat(array2.concat(array3.concat(array4)));
    var events2 = document.getElementsByClassName("ifwtOb elYzab-cXXICe-Hjleke NlL62b xHTz8b");
    var events3 = document.getElementsByClassName("dtaVuc OY8yJd");

    //var targetBoxId = targetBox.getAttribute("data-eventid").substring(0, 25) + targetBox.getAttribute("data-eventid").substring(45, 50);
    var targetColor = eventColors[targetBoxId];

    if (DEBUG) {
        console.log("PAY ATTENTION HERE");
        console.log(targetColor);
    }

    if (advanced) {
        targetBox = getTargetBox(targetBoxId);
        if (!targetBox) {
            if (DEBUG) {
                console.log("couldnt find target box");
            }
        }
    }

    var date;

    if (page == 1) {
        date = targetBox.children[0].innerHTML;
        if (date.length == 0) {
            date = targetBox.children[1].innerHTML;
        }
    } else if (page == 2) {
        if (targetBox.children[0].style["background-color"]) {
            if (targetBox.children.length == 2) {
                date = targetBox.children[1].children[1].innerHTML;
            } else {
                date = targetBox.children[0].children[1].innerHTML;
            }
        } else {
            date = targetBox.children[0].children[2].innerHTML;
        }

        events = events2;
    } else {
        date = targetBox.children[1].children[0].getAttribute("aria-label");
        events = events3;
    }

    if (recurrentChoice == "2") {

        for (let i = 0; i < events.length; i++) {

            if (!events[i].getAttribute("data-eventid")) {
                continue;
            }

            var eventDate;

            if (page == 1) {
                try {
                    eventDate = events[i].children[0].innerHTML;
                    if (eventDate.length == 0) {
                        eventDate = events[i].children[1].innerHTML;
                    }
                } catch (error) {
                    continue;
                }
            } else if (page == 2) {
                try {
                    if (events[i].children[0].style["background-color"]) {
                        if (events[i].children.length == 2) {
                            eventDate = events[i].children[1].children[1].innerHTML;
                        } else {
                            eventDate = events[i].children[0].children[1].innerHTML;
                        }
                    } else {
                        eventDate = events[i].children[0].children[2].innerHTML;
                    }
                } catch (error) {
                    continue;
                }
            } else {
                try {
                    eventDate = events[i].children[1].children[0].getAttribute("aria-label");
                } catch (error) {
                    continue;
                }

            }

            var eventId = events[i].getAttribute("data-eventid").substring(0, 25) + events[i].getAttribute("data-eventid").substring(45, 50);

            if (events[i].getAttribute("data-eventid").substring(0, 15) == targetBox.getAttribute("data-eventid").substring(0, 15) && compareDate(date, eventDate)) {
                eventColors[eventId] = targetColor;
            }

        }

        if (!recurringColorsRules[targetBox.getAttribute("data-eventid").substring(0, 15)]) {
            recurringColorsRules[targetBox.getAttribute("data-eventid").substring(0, 15)] = [];
        }

        //console.log("new rule made");
        recurringColorsRules[targetBox.getAttribute("data-eventid").substring(0, 15)].push({ "date": date, "done": [targetBoxId], "color": targetColor });

    }

    else if (recurrentChoice == "3") {
        //console.log("hi!");
        // if (page == 1) {
        // } else if (page == 2) {
        // 	events = events2;
        // } else {
        // 	events = events3;
        // }

        for (let i = 0; i < events.length; i++) {

            if (!events[i].getAttribute("data-eventid")) {
                continue;
            }

            ////console.log(events[i].getAttribute("data-eventid"));
            ////console.log(events[i].getAttribute("data-eventid"));

            var eventId = events[i].getAttribute("data-eventid").substring(0, 25) + events[i].getAttribute("data-eventid").substring(45, 50);

            if (events[i].getAttribute("data-eventid").substring(0, 15) == targetBox.getAttribute("data-eventid").substring(0, 15)) {
                eventColors[eventId] = targetColor;
            }
        }

        if (!recurringColorsRules[targetBox.getAttribute("data-eventid").substring(0, 15)]) {
            recurringColorsRules[targetBox.getAttribute("data-eventid").substring(0, 15)] = [];
        }

        if (DEBUG) {
            console.log("new rule made");
        }
        recurringColorsRules[targetBox.getAttribute("data-eventid").substring(0, 15)].push({ "date": "0", "done": [targetBoxId], "color": targetColor });
    }

    colorEvents(20);
    setTimeout(colorEvents, 100, 20);
    setTimeout(colorEvents, 200, 10);
    setTimeout(colorEvents, 300, 10);

    if (DEBUG) {
        console.log("event colors near end of recurrent choice");
        console.log(eventColors);
    }

    storageSync();

    var ab = setInterval(function () {

        if (document.getElementsByClassName("VYTiVb").length > 0 && document.getElementsByClassName("VYTiVb")[0].innerHTML.includes("Event saved")) {
            colorEvents(20);
            setTimeout(colorEvents, 30, 20);

            clearInterval(ab);
        }
    }, 75);

    setTimeout(function () { clearInterval(ab) }, 5000);

    var ac = setInterval(function () {

        if (document.getElementsByClassName("VYTiVb").length > 0 && document.getElementsByClassName("VYTiVb")[0].innerHTML.includes("Saving")) {
            colorEvents(20);
            setTimeout(colorEvents, 30, 20);

            clearInterval(ac);
        }
    }, 75);

    setTimeout(function () { clearInterval(ac) }, 5000);
}

//function turn month into num
function month2num(month) {
    if (month == "January") {
        return 1;
    }
    if (month == "February") {
        return 2;
    }
    if (month == "March") {
        return 3;
    }
    if (month == "April") {
        return 4;
    }
    if (month == "May") {
        return 5;
    }
    if (month == "June") {
        return 6;
    }
    if (month == "July") {
        return 7;
    }
    if (month == "August") {
        return 8;
    }
    if (month == "September") {
        return 9;
    }
    if (month == "October") {
        return 10;
    }
    if (month == "November") {
        return 11;
    }
    if (month == "December") {
        return 12;
    }
}

//function compare times, returns true if timeA earlier than timeB
function compareTime(timeA, timeB) {
    timeA = timeA.replace("am", "");
    timeA = timeA.replace("pm", "");
    timeB = timeB.replace("am", "");
    timeB = timeB.replace("pm", "");

    var timeAh = 0;
    var timeAm = 0;

    if (timeA.includes(":")) {
        timeAh = timeA.substring(0, timeA.indexOf(":"));
        timeAm = timeA.substring(timeA.indexOf(":") + 1, timeA.length);
    } else {
        timeAh = timeA;
    }

    var timeBh = 0;
    var timeBm = 0;

    if (timeB.includes(":")) {
        timeBh = timeB.substring(0, timeB.indexOf(":"));
        timeBm = timeB.substring(timeB.indexOf(":") + 1, timeB.length);
    } else {
        timeBh = timeB;
    }

    if (timeAh < timeBh) {
        return 1;
    } else if (timeAh == timeBh) {
        if (timeAm <= timeBm) {
            return 1;
        }
    }

    return 0;
}

//compare two dates, returns true if dateA earlier than dateB
function compareDate(dateA, dateB) {
    dateA = dateA.split(", ");
    dateB = dateB.split(", ");

    if (parseInt(dateA[dateA.length - 1], 10) < parseInt(dateB[dateB.length - 1], 10)) {
        return 1;
    } else if (parseInt(dateA[dateA.length - 1], 10) == parseInt(dateB[dateB.length - 1], 10)) {

        var dateAMD = dateA[dateA.length - 2].split(" ");
        var dateBMD = dateB[dateB.length - 2].split(" ");

        if (month2num(dateAMD[0]) < month2num(dateBMD[0])) {
            return 1;
        } else if (month2num(dateAMD[0]) == month2num(dateBMD[0])) {

            if (parseInt(dateAMD[1], 10) < parseInt(dateBMD[1], 10)) {
                return 1;
            } else if (parseInt(dateAMD[1], 10) == parseInt(dateBMD[1], 10)) {

                var dateAt = dateA[0].split(" ");
                var dateBt = dateB[0].split(" ");

                if (dateAt[0].includes("am") && dateBt[0].includes("pm")) {
                    return 1;
                } else if ((dateAt[0].includes("am") && dateBt[0].includes("am")) || (dateAt[0].includes("pm") && dateBt[0].includes("pm"))) {
                    if (compareTime(dateAt[0], dateBt[0])) {
                        return 1;
                    }
                }
            }
        }
    }

    return false;
}

//TODO: deal with advanced details page color selection
function advancedColorSelected(evnt, action) {
    currentColor = evnt.target.parentNode.style['background-color'];

    if (currentColor.includes('rgb')) {
        currentColor = rgb2hex(currentColor);
    }

    if (DEBUG) {
        console.log("recorded a color selection in advanced details");
        console.log(currentColor);
        console.log(targetBoxId);
    }
    colorAdvancedDetailsCircle(20);
}

function advancedSaveClicked(evnt) {
    if (DEBUG) {
        console.log('save has been clicked in advanced');
        console.log(currentColor);
        console.log(targetBoxId);
    }

    eventColors[targetBoxId] = currentColor;

    setTimeout(customColorSelected, 50, evnt, currentColor);
    setTimeout(recurringEvent, 100, 20, "advanced-color");
}

function colorAdvanced(count) {
    if (count <= 0) {
        return;
    }

    var array1 = Array.prototype.slice.call(document.getElementsByClassName("NlL62b EfQccc elYzab-cXXICe-Hjleke  EiZ8Dd afiDFd"), 0);
    var array2 = Array.prototype.slice.call(document.getElementsByClassName("ifwtOb elYzab-cXXICe-Hjleke NlL62b GHWQBd"), 0);
    var array3 = Array.prototype.slice.call(document.getElementsByClassName("NlL62b EfQccc elYzab-cXXICe-Hjleke EiZ8Dd"), 0);
    var array4 = Array.prototype.slice.call(document.getElementsByClassName("ifwtOb elYzab-cXXICe-Hjleke NlL62b"), 0);

    var events = array1.concat(array2.concat(array3.concat(array4)));
    var events2 = document.getElementsByClassName("ifwtOb elYzab-cXXICe-Hjleke NlL62b xHTz8b");
    var events3 = document.getElementsByClassName("dtaVuc OY8yJd");

    //getRules(20);
    //setTimeout(getRules, 100, 20);

    if (page == 4 || wait_init == 0 || (events.length == 0 || typeof events[0] == "undefined") && (events2.length == 0 || typeof events2[0] == "undefined")
        && (events3.length == 0 || typeof events3[0] == "undefined")) {

        setTimeout(colorAdvanced, 100, count - 1);
        return;

    }

    if (DEBUG) {
        console.log('TIME TO COLOR ADVANCED');
    }

    colorRecurring("advanced");
}

//color the little circle and set event listener for the button
function colorAdvancedDetailsCircle(count) {
    if (count <= 0) {
        return;
    }

    if (document.getElementsByClassName("bcSKBf xSrKnf").length == 0 || wait_init != 1) {

        if (DEBUG) {
            console.log("looking for advanced details circle");
        }

        setTimeout(colorAdvancedDetailsCircle, 25, count - 1);
        return;
    }

    var x = document.getElementsByClassName("bcSKBf xSrKnf");

    if (typeof currentColor == "undefined" || currentColor == null) {
        var temp_id = window.location.href.substring(window.location.href.lastIndexOf("/") + 1);
        currentColor = eventColors[temp_id.substring(0, 25) + temp_id.substring(45, 50)];

    }

    x[0].style["background-color"] = currentColor;

    if (DEBUG) {
        console.log("colored advanced details circle");
        console.log(currentColor);
        console.log(x[0]);
    }

    var button = document.getElementsByClassName("uArJ5e UQuaGc Y5sE8d guz9kb")[0];
    button.addEventListener("click", advancedSaveClicked);
}

//if calendar reloads (new page or whatever)
function hrefHandler() {
    this.oldHref = window.location.href;
    this.Check;

    var that = this;
    var detect = function () {
        if (that.oldHref != window.location.href) {
            if (window.location.href.includes("day")) {
                page = 1;
            } else if (window.location.href.includes("customweek")) {
                page = 2;
            } else if (window.location.href.includes("week")) {
                page = 1;
            } else if (window.location.href.includes("month")) {
                page = 2;
            } else if (window.location.href.includes("agenda")) {
                page = 3;
            } else if (window.location.href.includes("eventedit")) {
                page = 4;
                currentColor = null;
                colorAdvancedDetailsCircle(20);
            } else {
                page = 1;
            }

            startUp();
            that.oldHref = window.location.href;
        }
    };
    this.Check = setInterval(function () { detect() }, 100);
}

var hrefDetection = new hrefHandler();

//function start up
function startUp() {
    var events = document.getElementsByClassName("NlL62b EfQccc elYzab-cXXICe-Hjleke  EiZ8Dd afiDFd");
    var events2 = document.getElementsByClassName("ifwtOb elYzab-cXXICe-Hjleke NlL62b xHTz8b");
    var events3 = document.getElementsByClassName("dtaVuc OY8yJd");

    colorEvents(20);
    setTimeout(colorEvents, 150, 20);

    //getRules(20);
    //setTimeout(getRules, 100, 20);

    var z = setInterval(function () {
        if (wait_init == 0 || (events.length == 0 || typeof events[0] == "undefined") && (events2.length == 0 || typeof events2[0] == "undefined")
            && (events3.length == 0 || typeof events3[0] == "undefined")) {

        } else {
            colorEvents(20);
            setTimeout(colorEvents, 50, 20);
            setTimeout(colorEvents, 150, 20);

            //getRules(20);
            //setTimeout(getRules, 100, 20);

            clearInterval(z);
        }
    }, 100);

    setTimeout(function () { clearInterval(z) }, 30000);
}

if (page == 4) {
    colorAdvancedDetailsCircle(20);
}

startUp();