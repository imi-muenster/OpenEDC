export const colorLight = "#eef3fc";
export const colorMedium = "#5594fa";
export const colorDark = "#3273dc";

export function getColorArray(count, highlightIndex) {
    const colorNormal = colorLight;
    const colorHighlight = colorMedium;
    const colorArray = Array(count).fill(colorNormal);
    
    if (highlightIndex != null && highlightIndex <= count) colorArray[highlightIndex] = colorHighlight;
    return colorArray;
}
