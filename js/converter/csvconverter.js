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
    csvString += itemPaths.map(path => formatValue(metadataWrapper.getElementDefByOID(path.itemOID).getName())).join(",") + "\n";

    // Second, add the creation date and clinical data for each subject
    for (let [key, value] of Object.entries(subjectData)) {
        //get highest repeatKey
        const studyEvents = metadataWrapper.getStudyEvents();
        let highestRepeatKey = 0;
        for await (let studyEvent of [...studyEvents]) {
            const repeatKeyTemp = await clinicaldataWrapper.getStudyEventRepeatKeys(studyEvent.getAttribute('OID'), key);
            highestRepeatKey = Math.max(repeatKeyTemp.length, highestRepeatKey);
        }

        if(highestRepeatKey == 0) {
            csvString += key + ",";
            csvString += "1,";
            csvString += value["createdDate"] + ",";
            csvString += value["createdTime"] + ",";
            csvString += itemPaths.map(path => formatValue(value[path.toString()])).join(",") + "\n";
        }
        else {
            for (let i = 1; i <= highestRepeatKey; i++) {
                csvString += key + ",";
                csvString += i + ",";
                csvString += (i === 1 ? value["createdDate"] : '') + ",";
                csvString += (i === 1 ? value["createdTime"] :'') + ",";
                //if repeatkey is 1 the value can either be of a form without repeatkey or with repeatkey === 1, so we have to check for both
                //for repeatKey > 1 there always is a repeatKey extension added to the path
                csvString += itemPaths.map(path => {
                    const itemValue = i === 1 ? value[path.toString()] || value[`${path.toString()}-1`] : value[`${path.toString()}-${i}`];
                    return formatValue(itemValue);
                }).join(",") + "\n";
            }   
        }
    }

    return csvString;
}

export const getSeparatedCSVFiles = async () => {
    let files = [];
    const studyEvents = metadataWrapper.getStudyEvents();
    const subjectData = await clinicaldataWrapper.getAllData({ includeInfo: true });
    for(let i = 0; i < studyEvents.length; i++) {
        const studyEvent = studyEvents[i];
        const isRepeating = studyEvent.getAttribute('Repeating') === "Yes";
        const itemPaths = metadataWrapper.getItemPathsForStudyEvents(studyEvent.getAttribute('OID'));
        let csvString = ",,,,";
        csvString += itemPaths.map(path => path.toString().replace(/,/g, "")).join(",") + "\n";
        csvString += `Subject,RepeatKey,Creation_Date,Creation_Time,`;
        csvString += itemPaths.map(path => formatValue(metadataWrapper.getElementDefByOID(path.itemOID).getName())).join(",") + "\n";

        for await (let [key, value] of Object.entries(subjectData)) {
            let repeatableEventsCounts = 1;
            if(isRepeating) {
                const repeatableEvents = await clinicaldataWrapper.getStudyEventRepeatKeys(studyEvent.getAttribute('OID'), key);
                repeatableEventsCounts = repeatableEvents.length;
            }
            for(let k = 1; k <= repeatableEventsCounts; k++){
                csvString += key + ",";
                csvString += k + ",";
                csvString += (k === 1 ? value["createdDate"] : '') + ",";
                csvString += (k === 1 ? value["createdTime"] :'') + ",";
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
