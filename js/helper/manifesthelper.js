export function addManifest() {
    let pathName = window.location.pathname;
    if(pathName && pathName.endsWith("/")) pathName = "/";
    let url = `.${pathName != "/" ? pathName : ""}/manifest.json`;
    const manifestLink = document.createElement('link');
    manifestLink.id = 'manifest';
    manifestLink.rel = 'manifest';
    manifestLink.href = url;
    document.head.appendChild(manifestLink)
}