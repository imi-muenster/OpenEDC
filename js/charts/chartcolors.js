export const colorWhite = "#fff";
export const colorLight = "#e3ecfa";
export const colorMedium = "#5594fa";
export const colorDark = "#3273dc";
export const colorPalette = ["#92c0df", "#72a3c9", "#5485b2", "#89b8da", "#6a9bc3", "#4e7fac", "#80b0d5", "#6394be", "#4878a6", "#79aacf", "#5b8cb8", "#437a9f"];

export function getColorArray(isMonochrom, count, highlightIndex) {
    const colorNormal = colorLight;
    const colorHighlight = colorMedium;
    const colorArray = isMonochrom ? Array(count).fill(colorNormal) : Array.from(colorPalette);
    
    if (highlightIndex != null && highlightIndex <= count) colorArray[highlightIndex] = colorHighlight;
    return colorArray;
}
