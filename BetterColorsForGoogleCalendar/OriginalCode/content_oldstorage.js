
//init from storage
var colors = []; //user's custom colors
var eventColors = {}; //event -> color pairings
var recurringColorsRules = {}; //possible rules data structure
var page = 1; //1 = week, 2 = month (apparently week, day, 4 days have same box class, so all = 1)
var wait_init = 0;

if (window.location.href.includes("day")) {
    page = 1;
} else if (window.location.href.includes("week")) {
    page = 1;
} else if (window.location.href.includes("month")) {
    page = 2;
} else if (window.location.href.includes("customday")) {
    page = 1;
} else if (window.location.href.includes("agenda")) {
    page = 3;
}

chrome.storage.sync.get(null, function (items) {
    var allKeys = Object.keys(items);
    console.log(allKeys);

});

chrome.storage.sync.get(['colors'], function (data) {
    if (typeof data.colors != 'undefined') {
        colors = data.colors;
        //console.log("got colors from storage");
        //console.log(data.colors);
    }
});

chrome.storage.sync.get(['eventColors'], function (data) {
    if (typeof data.eventColors != 'undefined') {
        eventColors = data.eventColors;
        //console.log("got eventcolors from storage");
        //console.log(eventColors);
    }
    wait_init = 1;
});

// chrome.storage.sync.get('recurringColors', function(data) {
// 	if (typeof data.recurringColors != 'undefined') {
//     	eventColors = data.recurringColors;
//     	//console.log("got recurringcolors from storage");
//     }
//  });

var targetBox = "";
var recurrentChoice = "";

//get rules
function getRules(count) {
    if (count == 0) {
        return;
    }

    var events = document.getElementsByClassName("NlL62b EfQccc elYzab-cXXICe-Hjleke  EiZ8Dd afiDFd");
    var events2 = document.getElementsByClassName("ifwtOb elYzab-cXXICe-Hjleke NlL62b xHTz8b");
    var events3 = document.getElementsByClassName("dtaVuc OY8yJd");

    if ((page == 1 && (events.length == 0 || typeof events[0] == "undefined")) && (page == 2 && (events2.length == 0 || typeof events2[0] == "undefined"))
        && (page == 3 && (events3.length == 0 || typeof events3[0] == "undefined"))) {

        setTimeout(colorEvents, 50, count - 1);
        return;
    }

    if (page == 2) {
        events = events2;
    } else if (page == 3) {
        events = events3;
    }

    // for (let i = 0; i < events.length; i++) {
    // 	if (!events[i].getAttribute("data-eventid")) {
    // 		continue;
    // 	}
    // 	//console.log("fetching rule for: " + events[i].getAttribute("data-eventid"));
    // 	var id_ = "rules_" + events[i].getAttribute("data-eventid").substring(0, 15);
    // 	//console.log(id_);
    // 	chrome.storage.sync.get([id_], function(data) {
    // 		if (typeof data.id_ != 'undefined') {
    // 			//console.log("found rule");
    // 			recurringColorsRules[id_] = data.id_;
    // 	    }
    // 	 });
    // }

    chrome.storage.sync.get("recurrentRules", function (data) {
        if (typeof data.recurrentRules != 'undefined') {
            //console.log("found rules");
            recurringColorsRules = data.recurrentRules;
        }
    });

    //console.log("fetched rules");
}

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
    ////console.log("WEEK BOY");
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
    ////console.log("coloring event id");
    ////console.log(event_id);

    var event_rules = recurringColorsRules[event_id.substring(0, 15)];
    var did_something = false;

    if (event_rules) {
        // //console.log("FOUND A RULE");
        // //console.log(eventDate);
        // //console.log(event);
        // //console.log(event.children);

        for (let i = 0; i < event_rules.length; i++) {

            var event_rule = event_rules[i];
            // //console.log("this is my rule");
            // //console.log(event_rule);

            if (compareDate(event_rule["date"], eventDate)) {
                if (!event_rule["done"].includes(event_id)) {

                    ////console.log("colored with rule: " + event_id);

                    event.style["background-color"] = event_rule["color"];
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

        if (event.style["background-color"].includes("rgb")) {
            eventColors[event_id] = rgb2hex(event.style["background-color"]);
        } else {
            eventColors[event_id] = event.style["background-color"];
        }

        // //console.log('didnt find a color');
        // //console.log(event_id);
        // //console.log(eventColors[event_id]);


    } else {
        event.style["background-color"] = eventColors[event_id];
        // //console.log("found a color");
        // //console.log(event_id);
        // //console.log(eventColors[event_id]);
    }
}

//function to color one event circle (month view)
function colorEventMonth(event) {
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

    ////console.log("coloring event id");
    ////console.log(event_id);

    var event_rules = recurringColorsRules[event_id.substring(0, 15)];
    var did_something = false;

    if (event_rules) {
        //console.log('lmfao');
        //console.log(event);
        //console.log(eventDate);
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

    ////console.log("MONTH BOY");
    //console.log("coloring event id");
    //console.log(event_id);
    //console.log(eventSubColor);

    if (!eventColors[event_id]) {

        if (eventSubColor != "") {
            if (eventSubColor.includes("rgb")) {
                //console.log("hidey ho");
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
        ////console.log("found a color");
        ////console.log(event_id);
        ////console.log(eventColors[event_id]);
    }
    // if (eventColors[event_id] == "#039be5") {
    // 	//console.log("I MADE SOMETHING BLUE");
    // 	//console.log(event_id);
    // }
}

//function to color one event circle (schedule view)
function colorEventSched(event) {
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
        ////console.log("found a color");
        ////console.log(event_id);
        ////console.log(eventColors[event_id]);
    }
}

//schedule boxes: dtaVuc OY8yJd

//function to color events
function colorEvents(count) {

    ////console.log(count);
    ////console.log(page);

    if (count == 0) {
        return;
    }

    var events = document.getElementsByClassName("NlL62b EfQccc elYzab-cXXICe-Hjleke  EiZ8Dd afiDFd");
    var events2 = document.getElementsByClassName("ifwtOb elYzab-cXXICe-Hjleke NlL62b xHTz8b");
    var events3 = document.getElementsByClassName("dtaVuc OY8yJd");

    if ((page == 1 && (events.length == 0 || typeof events[0] == "undefined")) && (page == 2 && (events2.length == 0 || typeof events2[0] == "undefined"))
        && (page == 3 && (events3.length == 0 || typeof events3[0] == "undefined"))) {

        setTimeout(colorEvents, 50, count - 1);
        return;
    }

    ////console.log(events);
    //console.log(recurringColorsRules);
    ////console.log(eventColors);
    ////console.log(events2);
    ////console.log(events3);
    ////console.log(eventColors["N2FwMGYzbWk4ZHJjcmo3Z3AxMDhUMT"]);

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
    //console.log('colored stuff');
    //console.log(eventColors);
}

//function to update events
function updateEvents(count) {
    if (count == 0) {
        return;
    }

    var events = document.getElementsByClassName("NlL62b EfQccc elYzab-cXXICe-Hjleke  EiZ8Dd afiDFd");
    var events2 = document.getElementsByClassName("ifwtOb elYzab-cXXICe-Hjleke NlL62b xHTz8b");
    var events3 = document.getElementsByClassName("dtaVuc OY8yJd");

    if ((events.length == 0 || typeof events[0] == "undefined") && (events2.length == 0 || typeof events2[0] == "undefined")
        && (events3.length == 0 || typeof events3[0] == "undefined")) {
        setTimeout(updateEvents, 50, count - 1);
        return;
    }

    ////console.log(eventColors["N2FwMGYzbWk4ZHJjcmo3Z3AxMDhUMT"]);
    // //console.log("event color boys");
    // //console.log(eventColors);
    if (page == 1) {
        for (let i = 0; i < events.length; i++) {
            if (!events[i].getAttribute("data-eventid")) {
                continue;
            }

            if (events[i].style["background-color"].includes("rgb")) {
                eventColors[events[i].getAttribute("data-eventid").substring(0, 25) + events[i].getAttribute("data-eventid").substring(45, 50)] = rgb2hex(events[i].style["background-color"]);
            } else {
                eventColors[events[i].getAttribute("data-eventid").substring(0, 25) + events[i].getAttribute("data-eventid").substring(45, 50)] = events[i].style["background-color"];
            }
        }
    } else if (page == 2) {
        for (let i = 0; i < events2.length; i++) {
            if (!events2[i].getAttribute("data-eventid")) {
                continue;
            }
            var eventCircle;

            try {
                eventCircle = events2[i].children[0].children[0].children[0];
            } catch (error) {

            }

            var eventSub = events2[i].children[0];
            var eventSubColor = eventSub.style["background-color"];

            if (eventSubColor) {
                if (eventSubColor.includes("rgb")) {
                    eventColors[events2[i].getAttribute("data-eventid").substring(0, 25) + events2[i].getAttribute("data-eventid").substring(45, 50)] = rgb2hex(eventSubColor);
                } else {
                    eventColors[events2[i].getAttribute("data-eventid").substring(0, 25) + events2[i].getAttribute("data-eventid").substring(45, 50)] = eventSubColor;
                }
            } else if (eventCircle.style["border-color"].includes("rgb")) {
                eventColors[events2[i].getAttribute("data-eventid").substring(0, 25) + events2[i].getAttribute("data-eventid").substring(45, 50)] = rgb2hex(eventCircle.style["border-color"]);
            } else {
                eventColors[events2[i].getAttribute("data-eventid").substring(0, 25) + events2[i].getAttribute("data-eventid").substring(45, 50)] = eventCircle.style["border-color"];
            }
        }
    } else if (page == 3) {
        for (let i = 0; i < events3.length; i++) {

            if (!events3[i].getAttribute("data-eventid")) {
                continue;
            }

            var eventCircle = events3[i].children[2].children[0].children[0];

            if (eventCircle.style["border-color"].includes("rgb")) {
                eventColors[events3[i].getAttribute("data-eventid").substring(0, 25) + events3[i].getAttribute("data-eventid").substring(45, 50)] = rgb2hex(eventCircle.style["border-color"]);
            } else {
                eventColors[events3[i].getAttribute("data-eventid").substring(0, 25) + events3[i].getAttribute("data-eventid").substring(45, 50)] = eventCircle.style["border-color"];
            }
        }
    }
    //console.log("event colors updated");
    ////console.log(eventColors["N2FwMGYzbWk4ZHJjcmo3Z3AxMDhUMT"]);
    ////console.log(eventColors);

    cloudSync();
}

//edit calendar color menu
document.addEventListener("contextmenu", function (evnt) {
    initColorMenu(evnt, 3);
});

//init color menu
function initColorMenu(evnt, count) {
    if (count == 0) {
        return;
    }

    if (document.getElementById("colorSelector")) {
        setTimeout(initColorMenu, 50, evnt, count - 1);
        return;
    }

    targetBox = evnt.target;

    //console.log(targetBox);
    ////console.log(targetBox.getAttribute("class"));

    while (targetBox.tagName != 'HTML' && !(targetBox.getAttribute("data-eventid") && targetBox.style["border-color"]) && !(page == 3 && targetBox.getAttribute("data-keyboardactiontype"))) {
        // //console.log(targetBox);
        // //console.log(targetBox.tagName);
        // //console.log(!(targetBox.getAttribute("data-eventid") && targetBox.style["border-color"]));
        // //console.log(!(page == 3 && targetBox.getAttribute("data-keyboardactiontype")));
        targetBox = targetBox.parentNode;
    }

    //console.log(targetBox);
    ////console.log(evnt);
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

        //console.log("click?");

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

            //console.log(eventColors);

            recurringEvent(20, "delete");

            var z = setInterval(function () {

                if (document.getElementsByClassName("VYTiVb").length > 0 && document.getElementsByClassName("VYTiVb")[0].innerHTML.includes("deleted")) {
                    var targetBoxId = targetBox.getAttribute("data-eventid").substring(0, 25) + targetBox.getAttribute("data-eventid").substring(45, 50);

                    if (document.getElementsByClassName("I7OXgf dT3uCc gF3fI fNxzgd Inn9w iWO5td").length == 0) {
                        delete eventColors[targetBoxId];
                    }

                    //console.log("removed an event color " + targetBoxId);
                    clearInterval(z);
                }
            }, 250);

            setTimeout(function () { clearInterval(z) }, 10000);
        }
    });
}

//user selected a custom color
function customColorSelected(evnt, builtin) {
    //console.log(evnt);
    var selectedCircle = evnt.target.parentNode;

    // if (document.getElementsByClassName("I7OXgf dT3uCc gF3fI fNxzgd Inn9w iWO5td").length > 0) {
    // 	return;
    // }
    //targetBox.style["background-color"] = selectedCircle.style["background-color"];

    var targetBoxId = targetBox.getAttribute("data-eventid").substring(0, 25) + targetBox.getAttribute("data-eventid").substring(45, 50);

    //console.log(targetBoxId);
    //console.log(rgb2hex(selectedCircle.style["background-color"]));
    //var x = document.getElementsByClassName("I7OXgf dT3uCc gF3fI fNxzgd Inn9w iWO5td");

    if (selectedCircle.style["background-color"].includes("rgb")) {
        //console.log("hello");
        eventColors[targetBoxId] = rgb2hex(selectedCircle.style["background-color"]);
        //console.log(eventColors[targetBoxId]);
        //console.log(eventColors);
    } else {
        //console.log("QOIDJFSAOFIJADSF");
        eventColors[targetBoxId] = selectedCircle.style["background-color"];
    }

    // if (builtin) {
    // 	targetBox.style["background-color"] = selectedCircle.style["background-color"];
    // }
    //var x = document.getElementsByClassName("I7OXgf dT3uCc gF3fI fNxzgd Inn9w iWO5td");
    //console.log("new color set");

    if (document.getElementsByClassName("I7OXgf dT3uCc gF3fI fNxzgd Inn9w iWO5td").length == 0) {
        setTimeout(colorEvents, 30, 20);
    }

    //console.log(eventColors);
    //console.log("saved color");
    //console.log(targetBoxId);
    //console.log(rgb2hex(selectedCircle.style["background-color"]));

    cloudSync();
}

//sync current colors and eventcolors to cloud
function cloudSync() {
    ////console.log("eventColors");
    ////console.log(eventColors);

    chrome.storage.sync.set({ 'eventColors': eventColors }, function () {
        // //console.log('eventColors is set to ');
        // //console.log(eventColors);
    });

    chrome.storage.sync.set({ 'colors': colors }, function () {
        // //console.log('colors is set to ');
        // //console.log(colors);
    });

    chrome.storage.sync.set({ 'recurrentRules': recurringColorsRules }, function () {
        //console.log('recurrentrules is set to ');
        //console.log(recurringColorsRules);
    });

    // //console.log(recurringColorsRules);
    // var keys_ = Object.keys(recurringColorsRules);
    // //console.log(keys_);
    // for (let i = 0; i < keys_.length; i++) {
    // 	var key = "rules_" + keys_[i];
    // 	var rules = recurringColorsRules[keys_[i]];
    // 	//console.log(key);
    // 	//console.log(typeof key);
    // 	//console.log(rules);
    // 	chrome.storage.sync.set({[key]: rules}, function() {
    // 	      //console.log("saved rules for: " + key);
    // 	});
    // }
    ////console.log("updated sync");
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

    var x = document.getElementsByClassName("ZeXxJd");

    if (x.length == 0 || typeof x[0] == "undefined") {
        setTimeout(generateCheckMark, 30, evnt, count - 1);
        return;
    }

    var targetBoxId = targetBox.getAttribute("data-eventid").substring(0, 25) + targetBox.getAttribute("data-eventid").substring(45, 50);

    for (let i = 0; i < x.length; i++) {
        for (let k = 0; k < x[i].children.length; k++) {
            var circle = x[i].children[k];

            var circleColor = circle.style["background-color"];

            if (circleColor.includes("rgb")) {
                circleColor = rgb2hex(circleColor);
            }

            if (circleColor == eventColors[targetBoxId]) {
                circle.children[0].setAttribute("class", "DPvwYc rXgejc eO2Zfd");
            } else {
                circle.children[0].setAttribute("class", "DPvwYc rXgejc");
            }
            if (parseInt(circle.getAttribute("data-color-index"), 10) < 1000) {
                circle.addEventListener("click", function (evnt) {
                    //console.log(circle);
                    setTimeout(customColorSelected, 50, evnt, true);
                    setTimeout(recurringEvent, 100, 25, "color-builtin");
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

    var targetBoxId = targetBox.getAttribute("data-eventid").substring(0, 15);
    var rules = recurringColorsRules[targetBoxId];

    if (recurrentChoice == "2") {
        for (let i = rules.length - 2; i >= 0; i--) {
            if (compareDate(date, rules[i]["date"])) {
                rules.splice(i, 1);
            }
        }
        recurringColorsRules[targetBoxId] = rules;

    } else if (recurrentChoice == "3") {
        recurringColorsRules[targetBoxId] = [recurringColorsRules[targetBoxId].pop()];
    }

    //console.log("rules deleted for group: " + targetBoxId);
}

//look for built-in recurring
function builtInRecurring() {

    //console.log("recurring selected");
    setTimeout(updateEvents, 400, 20);
    setTimeout(deleteRules, 500);

    var z = setInterval(function () {

        if (document.getElementsByClassName("EIlDfe")[0].children.length > 30 && document.getElementsByClassName("EIlDfe")[0].children[30].innerHTML.includes("Event saved")) {

            //console.log("built in recurring saved");

            setTimeout(updateEvents, 400, 20);
            clearInterval(z);
        }
    }, 100);

    setTimeout(function () { clearInterval(z) }, 10000);
}

//generate menu w/ custom colors
function generateMenu(evnt, count) {
    if (count == 0) {
        return;
    }

    var x = document.getElementsByClassName("ZeXxJd");
    var y = document.getElementById("colorSelector");

    if (x.length == 0 || typeof x[0] == "undefined" || y) {
        setTimeout(generateMenu, 5, evnt, count - 1);
        return;
    }

    // //console.log(x.length);
    // //console.log(typeof x[0]);

    var nodeCopy = x[0].children[0];
    var bottomRow = x[x.length - 1];

    if (typeof bottomRow == 'undefined') {
        return;
    }

    var idx = 0;
    while (idx < colors.length) {
        if (bottomRow.children.length < 6) {
            //console.log("adding circle");
            var colorCircle = nodeCopy.cloneNode(true);
            colorCircle.setAttribute("data-color-index", 1000 + idx);
            colorCircle.setAttribute("data-color", colors[idx]);
            colorCircle.setAttribute("style", "background-color: " + colors[idx]);
            colorCircle.setAttribute("id", "button" + colors[idx]);

            colorCircle.addEventListener("click", function (evnt) {
                //console.log(colorCircle);
                setTimeout(customColorSelected, 50, evnt);
                setTimeout(recurringEvent, 100, 25, "color");
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

    var x = document.getElementsByClassName("ZeXxJd");
    var y = document.getElementById("colorSelector");

    if (x.length == 0 || y) {
        setTimeout(newSelector, 50, count - 1);
        return;
    }

    var nodeCopy = x[0].lastChild;
    var bottomRow = x[x.length - 1];

    if (typeof bottomRow == 'undefined') {
        return;
    }

    if (bottomRow.children.length == 6) {
        bottomRow = bottomRow.parentNode.appendChild(bottomRow.cloneNode(false));
    }

    var newColorCircle = nodeCopy.cloneNode(true);
    //console.log(newColorCircle);

    newColorCircle.id = "colorSelector";
    newColorCircle.setAttribute("data-color-index", "-1");
    newColorCircle.setAttribute("style", "background-color: #BFBBDC");
    //newColorCircle.setAttribute("class", "myButton");

    newColorCircle.addEventListener("click", function (evnt) {
        openColorSelector(evnt);
    });

    //console.log(newColorCircle.children);

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
            !(code > 64 && code < 91) && // upper alpha (A-Z)
            !(code > 96 && code < 123)) { // lower alpha (a-z)
            return false;
        }
    }
    return true;
}

//select a new color
function openColorSelector(evnt) {
    // //console.log("i've been clicked");
    // //console.log(evnt);

    var color = prompt("Enter color hexcode (without # sign):");

    if (!color || color.length != 6 || !isAlphaNumeric(color) || colors.includes("#" + color)) {
        alert("Please enter a valid 6 character hexcode that is not already in the menu.");
        return;
    }

    if (color) {
        colors.push("#" + color);

        var x = document.getElementsByClassName("ZeXxJd");
        var nodeCopy = x[0].children[0];
        var bottomRow = x[x.length - 1];

        bottomRow.removeChild(bottomRow.lastChild);

        var colorCircle = nodeCopy.cloneNode(true);
        colorCircle.setAttribute("data-color-index", 1000 + colors.length - 1);
        colorCircle.setAttribute("data-color", colors[colors.length - 1]);
        colorCircle.setAttribute("style", "background-color: " + colors[colors.length - 1]);
        colorCircle.setAttribute("id", "button" + colors[colors.length - 1]);

        colorCircle.addEventListener("click", function (evnt) {
            //console.log(colorCircle);
            setTimeout(customColorSelected, 50, evnt);
            setTimeout(recurringEvent, 100, 25, "color");
        });

        bottomRow.appendChild(colorCircle);
        newSelector(20);
    }

    setTimeout(colorEvents, 100, 10);
    cloudSync();
}

//console.log("hi!");

//make sure every click syncs
document.addEventListener("click", function (evnt) {

    ////console.log(window.location);

    setTimeout(checkExpand, 1, 20);
});

document.addEventListener("mousedown", function (evnt) {
    setTimeout(checkDrag, 1, 20);
});

//check for expand dialog
function checkExpand(count) {
    if (count == 0) {
        return;
    }
    if (document.getElementsByClassName("jefcFd").length == 0) {
        setTimeout(checkExpand, 10, count - 1);
        return;
    }

    var x = setInterval(function () {
        if (document.getElementsByClassName("jefcFd").length == 0) {
            colorEvents(20);
            clearInterval(x);
        }
    }, 150);

    colorEvents(20);
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

    //console.log("drag detected");

    var x = setInterval(function () {
        if (document.getElementsByClassName("NlL62b EfQccc elYzab-cXXICe-Hjleke  EiZ8Dd Sb44q afiDFd").length == 0) {

            setTimeout(checkDragRecurring, 20, 10);

            setTimeout(colorEvents, 50, 20);
            clearInterval(x);
        }
    }, 200);

    setTimeout(function () { clearInterval(x) }, 10000);

    var z = setInterval(function () {

        if (document.getElementsByClassName("EIlDfe")[0].children.length > 30 && document.getElementsByClassName("EIlDfe")[0].children[30].innerHTML.includes("Event saved")) {

            //console.log("drag finish, saved, detected");
            colorEvents(20);
            setTimeout(colorEvents, 100, 20);
            setTimeout(colorEvents, 400, 20);
            clearInterval(z);
        }
    }, 200);

    setTimeout(function () { clearInterval(z) }, 10000);

    var y = setInterval(function () {

        if (document.getElementsByClassName("EIlDfe")[0].children.length > 30 && document.getElementsByClassName("EIlDfe")[0].children[30].innerHTML.includes("Saving")) {

            //console.log("drag finish, saving, detected");
            colorEvents(20);
            setTimeout(colorEvents, 50, 20);
            clearInterval(y);
        }
    }, 200);

    setTimeout(function () { clearInterval(y) }, 10000);
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

        if (document.getElementsByClassName("EIlDfe")[0].children.length > 30 && document.getElementsByClassName("EIlDfe")[0].children[30].innerHTML.includes("Event saved")) {

            //console.log("drag finish, saved, detected");
            colorEvents(20);
            clearInterval(x);
        }
    }, 200);

    setTimeout(function () { clearInterval(x) }, 10000);

    var y = setInterval(function () {

        if (document.getElementsByClassName("EIlDfe")[0].children.length > 30 && document.getElementsByClassName("EIlDfe")[0].children[30].innerHTML.includes("Saving")) {

            //console.log("drag finish, saving, detected");
            colorEvents(20);
            clearInterval(y);
        }
    }, 200);

    setTimeout(function () { clearInterval(y) }, 10000);

    var z = setInterval(function () {

        if (document.getElementsByClassName("I7OXgf dT3uCc gF3fI fNxzgd Inn9w iWO5td").length == 0) {

            //console.log("drag finish detected");
            colorEvents(20);
            clearInterval(z);
        }
    }, 200);

    setTimeout(function () { clearInterval(z) }, 10000);
    colorEvents(20);
}

//look for recurring event prompt
function recurringEvent(count, action) {
    ////console.log(action + " " + count);
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

    //console.log(buttons)
    // x[0].addEventListener("click", function(evnt) {
    // 	//console.log("found the recurrent event");
    // 	setTimeout(updateEvents, 500, 10);
    // });
    ////console.log(buttons.children);

    recurrentChoice = "1";

    buttons.children[0].addEventListener("click", function (evnt) {
        //console.log("detected click 1");
        recurrentChoice = "1";
    });

    buttons.children[1].addEventListener("click", function (evnt) {
        //console.log("detected click 2");
        recurrentChoice = "2";
    });

    buttons.children[2].addEventListener("click", function (evnt) {
        //console.log("detected click 3");
        recurrentChoice = "3";
    });

    // ok_button.addEventListener("click", function(evnt) {
    // 	//console.log("ok button clicked");
    // 	setTimeout(colorRecurring, 50);
    // });

    x[0].addEventListener("click", function (evnt) {

        var target = evnt.target;

        ////console.log(target.getAttribute("jsaction"));

        while (!target.getAttribute("jsaction")) {
            target = target.parentNode;
        }

        ////console.log(target.getAttribute("class"));

        if (target.getAttribute("class") == "uArJ5e UQuaGc kCyAyd l3F1ye ARrCac HvOprf evJWRb M9Bg4d qs41qe") {
            //console.log("wat");
            if (action == "color") {
                setTimeout(colorRecurring, 50);
            } else if (action == "delete") {
                setTimeout(deleteRecurring, 50);
            } else if (action == "color-builtin") {
                setTimeout(colorRecurring, 50);
                setTimeout(builtInRecurring, 50);
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
    //console.log("recurrentChoice " + recurrentChoice + " deleting");

    var events = document.getElementsByClassName("NlL62b EfQccc elYzab-cXXICe-Hjleke  EiZ8Dd afiDFd");
    var events2 = document.getElementsByClassName("ifwtOb elYzab-cXXICe-Hjleke NlL62b xHTz8b");
    var events3 = document.getElementsByClassName("dtaVuc OY8yJd");

    if (recurrentChoice == "1") {
        try {
            //console.log("removed an event color " + targetBoxId);
            delete eventColors[targetBoxId];
        } catch (error) {
            //console.log("oopsies here");
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
                //console.log("hixd");
                try {
                    //console.log("removed an event color " + eventId);
                    delete eventColors[eventId];
                } catch (error) {
                    //console.log("oopsies here");
                }
            }
        }
    }

    if (recurrentChoice == "3") {
        //console.log("hi!");

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

            ////console.log(events[i].getAttribute("data-eventid"));

            var eventId = events[i].getAttribute("data-eventid").substring(0, 25) + events[i].getAttribute("data-eventid").substring(45, 50);

            if (events[i].getAttribute("data-eventid").substring(0, 15) == targetBox.getAttribute("data-eventid").substring(0, 15)) {

                //console.log("deleted");
                try {
                    //console.log("removed an event color " + eventId);
                    delete eventColors[eventId];
                } catch (error) {
                    //console.log("oopsies here");
                }
            }
        }
    }
}

//color recurring events based on user option
function colorRecurring() {

    //console.log("recurrentChoice " + recurrentChoice + " coloring");
    var events = document.getElementsByClassName("NlL62b EfQccc elYzab-cXXICe-Hjleke  EiZ8Dd afiDFd");
    var events2 = document.getElementsByClassName("ifwtOb elYzab-cXXICe-Hjleke NlL62b xHTz8b");
    var events3 = document.getElementsByClassName("dtaVuc OY8yJd");

    //var edited_events = []

    var targetBoxId = targetBox.getAttribute("data-eventid").substring(0, 25) + targetBox.getAttribute("data-eventid").substring(45, 50);
    var targetColor = eventColors[targetBoxId];

    //console.log(targetColor);
    //console.log(targetBox);

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
        // if (page == 1) {
        // 	date = targetBox.children[0].innerHTML;
        // } else if (page == 2) {
        // 	date = targetBox.children[0].children[2].innerHTML;
        // 	events = events2;
        // } else {
        // 	date = targetBox.children[1].children[0].getAttribute("aria-label");
        // 	events = events3;
        // }

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
                ////console.log("hi");
                //edited_events.push(eventId);
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

            var eventId = events[i].getAttribute("data-eventid").substring(0, 25) + events[i].getAttribute("data-eventid").substring(45, 50);

            if (events[i].getAttribute("data-eventid").substring(0, 15) == targetBox.getAttribute("data-eventid").substring(0, 15)) {

                ////console.log("colored");
                //edited_events.push(eventId);
                eventColors[eventId] = targetColor;
            }
        }

        if (!recurringColorsRules[targetBox.getAttribute("data-eventid").substring(0, 15)]) {
            recurringColorsRules[targetBox.getAttribute("data-eventid").substring(0, 15)] = [];
        }

        //console.log("new rule made");
        recurringColorsRules[targetBox.getAttribute("data-eventid").substring(0, 15)].push({ "date": "0", "done": [targetBoxId], "color": targetColor });
    }

    colorEvents(20);
    //console.log(eventColors);
    setTimeout(updateEvents, 150, 20);

    var ab = setInterval(function () {

        if (document.getElementsByClassName("EIlDfe")[0].children.length > 30 && document.getElementsByClassName("EIlDfe")[0].children[30].innerHTML.includes("Event saved")) {
            colorEvents(20);
            setTimeout(colorEvents, 150, 20);

            ////console.log("me2");

            setTimeout(updateEvents, 200, 20);
            clearInterval(ab);
        }
    }, 200);

    setTimeout(function () { clearInterval(ab) }, 10000);

    var ac = setInterval(function () {

        if (document.getElementsByClassName("EIlDfe")[0].children.length > 30 && document.getElementsByClassName("EIlDfe")[0].children[30].innerHTML.includes("Saving")) {
            colorEvents(20);
            setTimeout(colorEvents, 150, 20);
            clearInterval(ac);
        }
    }, 200);

    setTimeout(function () { clearInterval(ac) }, 10000);
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
    // //console.log(dateA);
    // //console.log(dateB);
    dateA = dateA.split(", ");
    dateB = dateB.split(", ");

    if (parseInt(dateA[dateA.length - 1], 10) < parseInt(dateB[dateB.length - 1], 10)) {
        return 1;
    } else if (parseInt(dateA[dateA.length - 1], 10) == parseInt(dateB[dateB.length - 1], 10)) {

        ////console.log("here1");
        var dateAMD = dateA[dateA.length - 2].split(" ");
        var dateBMD = dateB[dateB.length - 2].split(" ");

        ////console.log(dateAMD);
        ////console.log(dateBMD);

        if (month2num(dateAMD[0]) < month2num(dateBMD[0])) {
            return 1;
        } else if (month2num(dateAMD[0]) == month2num(dateBMD[0])) {
            ////console.log("here2");
            if (parseInt(dateAMD[1], 10) < parseInt(dateBMD[1], 10)) {
                return 1;
            } else if (parseInt(dateAMD[1], 10) == parseInt(dateBMD[1], 10)) {
                ////console.log("here3");
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

    ////console.log("returned 0");
    return false;
}

//console.log("hi!");

//if calendar reloads (new page or whatever)
function hrefHandler() {
    this.oldHref = window.location.href;
    this.Check;

    var that = this;
    var detect = function () {
        if (that.oldHref != window.location.href) {

            if (window.location.href.includes("day")) {
                page = 1;
            } else if (window.location.href.includes("week")) {
                page = 1;
            } else if (window.location.href.includes("month")) {
                page = 2;
            } else if (window.location.href.includes("customday")) {
                page = 1;
            } else if (window.location.href.includes("agenda")) {
                page = 3;
            }

            //console.log("url change " + page);
            startUp();
            that.oldHref = window.location.href;
        }
    };
    this.Check = setInterval(function () { detect() }, 80);
}

var hrefDetection = new hrefHandler();

//function start up
function startUp() {
    var events = document.getElementsByClassName("NlL62b EfQccc elYzab-cXXICe-Hjleke  EiZ8Dd afiDFd");
    var events2 = document.getElementsByClassName("ifwtOb elYzab-cXXICe-Hjleke NlL62b xHTz8b");
    var events3 = document.getElementsByClassName("dtaVuc OY8yJd");

    colorEvents(20);
    setTimeout(colorEvents, 150, 20);

    getRules(20);
    setTimeout(getRules, 100, 20);

    var z = setInterval(function () {
        if (wait_init == 0 || (events.length == 0 || typeof events[0] == "undefined") && (events2.length == 0 || typeof events2[0] == "undefined")
            && (events3.length == 0 || typeof events3[0] == "undefined")) {

        } else {

            // //console.log("meme");
            // //console.log(events);
            // //console.log(events2);
            // //console.log(events3);
            // //console.log(eventColors);

            colorEvents(20);
            setTimeout(colorEvents, 150, 20);

            getRules(20);
            setTimeout(getRules, 100, 20);

            clearInterval(z);
        }
    }, 500);

    setTimeout(function () { clearInterval(z) }, 30000);
}

startUp();