class Repository {
    constructor(name, parameterName, downloadURL) {
        this.name = name;
        this.parameterName = parameterName;
        this.downloadURL = downloadURL;
    }

    getDownloadUrl(parameter) {
        return this.downloadURL.replace(this.parameterName, parameter);
    }
}

const repositories = [
    new Repository("Portal of Medical Data Models", "modelIds", "https://mdmj-staging.uni-muenster.de/modelIds/download?format=odm&form-lang=en")
];

export const getParameterNames = () => {
    return repositories.map(repository => repository.parameterName);
}

export const getModel = async (parameterName, parameter) => {
    const repository = repositories.find(repository => repository.parameterName == parameterName);

    const response = await fetch(repository.getDownloadUrl(parameter), {
        credentials: "include"
    });
    if (!response.ok) throw response.status;

    const odmXMLString = await response.text();
    return Promise.resolve(odmXMLString);
}
