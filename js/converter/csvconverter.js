import * as metadataWrapper from "../odmwrapper/metadatawrapper.js";
import * as clinicaldataWrapper from "../odmwrapper/clinicaldatawrapper.js";

export const getCSVString = async () => {
    const itemPaths = metadataWrapper.getItemPaths();
    const subjectData = await clinicaldataWrapper.getAllData({ includeInfo: true });

    // Start with an empty CSV string only and add the item OIDs as headers
    let csvString = ",,,,";
    csvString += itemPaths.map(path => path.toString().replace(/,/g, "")).join(",") + "\n";

    // Then, add the subject column as well as the creation date and add the item names as headers to the CSV string
    csvString += "Subject,RepeatKey,Creation_Date,Creation_Time,";
    csvString += itemPaths.map(path => metadataWrapper.getElementDefByOID(path.itemOID).getName()).join(",") + "\n";

    // Second, add the creation date and clinical data for each subject
    for (let [key, value] of Object.entries(subjectData)) {
        csvString += key + ",";
        csvString += value["createdDate"] + ",";
        csvString += value["createdTime"] + ",";
        csvString += itemPaths.map(path => formatValue(value[path.toString()])).join(",") + "\n";
    }

    return csvString;
}

export const getSeparatedCSVFiles = async () => {
    let files = [];
    const studyEvents = metadataWrapper.getStudyEvents();
    const subjectData = await clinicaldataWrapper.getAllData({ includeInfo: true });
    for(let i  = 0; i < studyEvents.length; i++) {
        const studyEvent = studyEvents[i];
        const isRepeating = studyEvent.getAttribute('Repeating') === "Yes";
        const itemPaths = metadataWrapper.getItemPathsForStudyEvents(studyEvent.getAttribute('OID'));
        let csvString = ",,,,";
        csvString += itemPaths.map(path => path.toString().replace(/,/g, "")).join(",") + "\n";
        csvString += `Subject,RepeatKey,Creation_Date,Creation_Time,`;
        csvString += itemPaths.map(path => metadataWrapper.getElementDefByOID(path.itemOID).getName()).join(",") + "\n";

        for await (let [key, value] of Object.entries(subjectData)) {
            console.log(key);
            console.log(value); 
            let repeatableEventsCounts = 1;
            console.log(isRepeating);
            if(isRepeating) {
                console.log(key, studyEvent.getAttribute('OID'))
                const repeatableEvents = await clinicaldataWrapper.getStudyEventRepeatKeys(studyEvent.getAttribute('OID'), key);
                console.log('in repeating');
                console.log(repeatableEvents.length);
                repeatableEventsCounts = repeatableEvents.length;
            }
            console.log(repeatableEventsCounts)
            for(let k = 1; k <= repeatableEventsCounts; k++){
                csvString += key + ",";
                csvString += k + ",";
                csvString += (k === 1 ? value["createdDate"] : '') + ",";
                csvString += (k === 1 ? value["createdTime"] :'') + ",";
                itemPaths.forEach(path => console.log(path.toString() + (isRepeating ? `-${k}` : '')));
                csvString += itemPaths.map(path => formatValue(value[path.toString() + (isRepeating ? `-${k}` : '')])).join(",") + "\n";
            }
        }
        files.push({filename: studyEvent.getAttribute('Name'), extension: 'csv', content: csvString});
    }
    return files;
}

const formatValue = value => {
    value = value ? value.replace(/'/g, '"').replace(/"/g, '""'): "";
    return value.includes(",") ? '"' + value + '"' : value
}
