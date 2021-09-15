export const colorWhite = "#fff";
export const colorLight = "#e3ecfa";
export const colorMedium = "#5594fa";
export const colorDark = "#3273dc";
export const colorPalette = ["#89b8da", "#79aacf", "#6a9bc3", "#5b8cb8", "#4e7fac", "#437a9f", "#376491", "#2a5783", "#afd6ed", "#9bc7e4"];

export function getColorArray(isMonochrom, count, highlightIndex) {
    const colorNormal = colorLight;
    const colorHighlight = colorMedium;
    const colorArray = isMonochrom ? Array(count).fill(colorNormal) : Array.from(colorPalette);
    
    if (highlightIndex != null && highlightIndex <= count) colorArray[highlightIndex] = colorHighlight;
    return colorArray;
}
