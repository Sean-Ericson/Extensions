colors = []

function setup() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { req: "need color" }, function (response) {
            colors = response['color'];
            //console.log('colors received');
            //console.log(colors);
            generate_colors();
        });
    });
};

setup();

function clear_color_menu() {
    var x = document.getElementsByClassName('menu')[0];
    var child = x.lastElementChild;
    while (child) {
        x.removeChild(child);
        child = x.lastElementChild;
    }
}

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.msg === "update_color_menu") {
            //console.log("popup updating colors");
            colors = request.data['color'];
            generate_colors();
        }
    }
);

function generate_colors() {
    clear_color_menu();
    var menu = document.getElementById("menu-id");
    var n = colors.length;
    var row_len = 8;
    var rows = Math.ceil(n / row_len);
    var idx = 0;

    //console.log(rows);

    if (n > 0) {

        var descrip = document.getElementById("description");
        descrip.innerHTML = " Click on a color below to remove it! ";

        for (let i = 0; i < rows; i++) {
            var row = document.createElement('div');
            row.className = "row";
            //console.log(row);
            document.getElementsByClassName('menu')[0].appendChild(row);
            for (let k = 0; k < row_len; k++) {
                if (idx >= n) {
                    i = rows;
                    break;
                }

                var color = colors[idx];
                //console.log(color);

                var container = document.createElement('div');
                container.className = "colorContainer";
                row.appendChild(container);

                var colorCircle = document.createElement('div');
                colorCircle.className = "colorCircle";
                colorCircle.style['background-color'] = color;

                var x_text = document.createElement('span');
                x_text.className = "x_text";


                container.append(x_text);
                container.appendChild(colorCircle);


                container.addEventListener("click", function () {
                    //console.log("ive been clicked");
                    color_clicked(this.lastChild.style['background-color']);
                });

                container.addEventListener("mouseover", function () {
                    set_x(true, this.firstChild);
                    set_circle(true, this.lastChild);
                });

                container.addEventListener("mouseout", function () {
                    set_x(false, this.firstChild);
                    set_circle(false, this.lastChild);
                });


                idx++;

            }
        }
    } else {
        var descrip = document.getElementById("description");
        descrip.innerHTML = " Click on a color below to remove it! (currently no colors)";
    }
}

function rgb2hex(rgb) {
    rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    function hex(x) {
        return ("0" + parseInt(x).toString(16)).slice(-2);
    }
    return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
}

function color_clicked(color) {
    if (color.includes("rgb")) {
        color = rgb2hex(color)
    }

    var result = colors.findIndex(item => color.toLowerCase() === item.toLowerCase());

    colors.splice(result, 1);

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { req: "delete color", color_del: color });
    });

    const menu = document.getElementById("menu-id");

    while (menu.firstChild) {
        menu.removeChild(menu.firstChild);
    }

    generate_colors();

}

function set_x(action, x_text) {
    if (action)
        x_text.innerHTML = "x";
    else
        x_text.innerHTML = "";
}

function set_circle(action, circle) {
    if (action) {
        circle.style['height'] = '17px';
        circle.style['width'] = '17px';
    } else {
        circle.style['height'] = '18px';
        circle.style['width'] = '18px';
    }
}