class Repository {
    constructor(name, modelParameterName, tokenParameterName, downloadURL) {
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
// The model parameter name (e.g., modelIds) must be unique to identify the repository
const repositories = [
    new Repository("Portal of Medical Data Models", "modelIds", "userToken", `https://mdmj-staging.uni-muenster.de/api/v1/odmByToken?modelId=${modelPlaceholder}&userToken=${tokenPlaceholder}`)
];

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
    
        const odmXMLString = await response.text();
        models.push(odmXMLString);

        if (tokenParameters.length > 1) tokenParameters.shift();
    }
    
    return Promise.resolve(models.length > 0 ? models : null);
}
