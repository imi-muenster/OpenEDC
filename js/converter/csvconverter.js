import * as metadataWrapper from "../odmwrapper/metadatawrapper.js";
import * as clinicaldataWrapper from "../odmwrapper/clinicaldatawrapper.js";

export const getCSVString = async () => {
    const itemPaths = metadataWrapper.getItemPaths();
    const subjectData = await clinicaldataWrapper.getAllData();

    // Start with an empty CSV string only containing the subject column
    let csvString = "Subject,";

    // First, add the headers to the CSV string
    csvString += itemPaths.map(path => path.toString().replace(/,/g, "")).join(",") + "\n";

    // Second, add the clinical data for each subject
    for (let [key, value] of Object.entries(subjectData)) {
        csvString += key + ",";
        csvString += itemPaths.map(path => formatValue(value[path.toString()])).join(",") + "\n";
    }

    return csvString;
}

const formatValue = value => {
    value = value ? value.replace(/'/g, '"').replace(/"/g, '""'): "";
    return value.includes(",") ? '"' + value + '"' : value
}
