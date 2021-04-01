class Repository {
    constructor(id, name, modelParameterName, tokenParameterName, downloadURL) {
        this.id = id;
        this.name = name;
        this.modelParameterName = modelParameterName;
        this.tokenParameterName = tokenParameterName;
        this.downloadURL = downloadURL;
    }

    getDownloadUrl(modelParameter, tokenParameter) {
        return this.downloadURL.replace(modelPlaceholder, modelParameter).replace(tokenPlaceholder, tokenParameter);
    }
}

// Placeholder for the download URL
const modelPlaceholder = "MODELPLACEHOLDER";
const tokenPlaceholder = "TOKENPLACEHOLDER";

// A list of all supported metadata repositories
// The model parameter name (e.g., modelIds) must be unique to identify the repository with given URL parameters
const repositories = [
    new Repository(1, "Portal of Medical Data Models", "modelIds", "userToken", `https://medical-data-models.org/api/v1/odmByToken?modelId=${modelPlaceholder}&userToken=${tokenPlaceholder}`)
];

// Download and return all models
export const getModels = async urlParams => {
    const modelParameterNames = repositories.map(repository => repository.modelParameterName);
    const tokenParameterNames = repositories.map(repository => repository.tokenParameterName);

    let repository;
    const modelParameters = [];
    const tokenParameters = [];
    for (const [parameterName, parameterValue] of urlParams) {
        if (!repository) repository = repositories.find(repository => repository.modelParameterName == parameterName);
        if (modelParameterNames.includes(parameterName)) modelParameters.push(parameterValue);
        if (tokenParameterNames.includes(parameterName)) tokenParameters.push(parameterValue);
    }
    
    const models = [];
    for (const modelParameter of modelParameters) {
        const response = await fetch(repository.getDownloadUrl(modelParameter, tokenParameters[0]));
        if (!response.ok) throw response.status;
    
        const odmXMLString = prepareODM(repository, modelParameter, await response.text());
        models.push(odmXMLString);

        if (tokenParameters.length > 1) tokenParameters.shift();
    }
    
    return Promise.resolve(models.length > 0 ? models : null);
}

// Depending on the repository, prepare the downloaded ODM for further processing
const prepareODM = (repository, modelParameter, odmXMLString) => {
    // The Portal of Medical Data Models often simply uses "ODM" as StudyEvent name which is therefore replaced with the study name for legibility
    // If there is more than one study event, the study name is appended
    // Moreover, the portal includes the model's id as study name prefix which is removed first
    if (repository.id == 1) {
        const odm = new DOMParser().parseFromString(odmXMLString, "text/xml");
        const studyName = odm.querySelector("StudyName").textContent.replace(modelParameter + "_", "");
        odm.querySelector("StudyName").textContent = studyName;

        const studyEventDefs = odm.querySelectorAll("MetaDataVersion StudyEventDef");
        if (studyEventDefs.length == 1) studyEventDefs[0].setAttribute("Name", studyName);
        else studyEventDefs.forEach(studyEventDef => studyEventDef.setAttribute("Name", studyEventDef.getAttribute("Name") + " - " + studyName));

        odmXMLString = new XMLSerializer().serializeToString(odm);
    }

    return odmXMLString;
}
