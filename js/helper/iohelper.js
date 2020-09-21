const $ = query => document.querySelector(query);

export function removeElements(elements) {
    for (let element of elements) {
        element.remove();
    }
}

export function download(filename, content) {
    let prettifiedContent = prettifyContent(content);

    let element = document.createElement("a");
    element.setAttribute("href", "data:text/xml;charset=utf-8," + encodeURIComponent(prettifiedContent));
    element.setAttribute("download", filename);

    element.style.display = "none";
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}

export async function getFileContent(file) {
    let data = await new Response(file).text();
    return data;
}

export function getBaseURL() {
    return window.location.origin + window.location.pathname;
}

export function prettifyContent(content) {
    let nsRemoved = content.replace(new RegExp(` xmlns=""`, "g"), "");

    let formatted = "";
    let indent= "";
    let tab = "    ";

    nsRemoved.split(/>\s*</).forEach(function(node) {
        if (node.match( /^\/\w/ )) indent = indent.substring(tab.length);
        formatted += indent + '<' + node + '>\r\n';
        if (node.match( /^<?\w[^>]*[^\/]$/ )) indent += tab;
    });

    return formatted.substring(1, formatted.length-3);
}

// StopRepeat used to overcome Firefox caveat
export function setTreeMaxHeight(stopRepeat) {
    const offset = 30;
    const minHeight = 250;

    let windowHeight = window.innerHeight;
    let panelHeadingBottom = document.querySelector(".panel-heading").getBoundingClientRect().bottom;
    let addButtonHeight = document.querySelector("#study-events-add-button").getBoundingClientRect().height;
    let remainingSpace = windowHeight - panelHeadingBottom - addButtonHeight - offset;

    if (remainingSpace < 0 && !stopRepeat) {
        setTimeout(
            function() {
              setTreeMaxHeight(true);
        }, 1000);
    }

    if (remainingSpace < minHeight) {
        remainingSpace = minHeight;
    }

    let treePanelBlocks = document.querySelectorAll(".tree-panel-blocks");
    for (let treePanelBlock of treePanelBlocks) {
        treePanelBlock.style.maxHeight = `${remainingSpace}px`;
    }
}

// IO listeners that are valid for the entire app and cannot be assigned to either the metadatamodule or clinicaldatamodule
export function setIOListeners() {
    // TODO: This style everywhere or onclick here
    $(".navbar-burger").addEventListener("click", () => {
        $(".navbar-menu").classList.toggle("is-active");
        $(".navbar-burger").classList.toggle("is-active");
        $("#language-dropdown").classList.add("is-hidden-mobile");
    });

    $("#current-language").addEventListener("click", () => $("#language-dropdown").classList.toggle("is-hidden-mobile"));

    $("body").onresize = setTreeMaxHeight;
}
