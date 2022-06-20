var local = false;

chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { req: "local storage" }, function (response) {
        //console.log("response!");
        //console.log(response);
        local = response['local'];
        //console.log('local storage?' + local);
        setup_local_button();
    });
});

function label_local_button() {
    var local_button = document.getElementById("toggleStorageButton");
    //console.log("local button");
    //console.log(local_button);
    if (local) {
        local_button.textContent = "Toggle to Cloud Sync Mode";
    } else {
        local_button.textContent = "Toggle to Local Mode";
    }
}

function inform_main() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        //console.log('sending local storage to main ' + local);
        chrome.tabs.sendMessage(tabs[0].id, { req: "local set", local: local });
    });
}

function setup_local_button() {
    label_local_button();
    var local_button = document.getElementById("toggleStorageButton");
    local_button.addEventListener('click', function toggle_storage() {
        local = !local;
        label_local_button();
        inform_main();
    });
}