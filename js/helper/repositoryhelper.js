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

const supportedRepositories = [
    new Repository("Portal of Medical Data Models", "modelIds", "https://medical-data-models.org/modelIds/download?format=odm&form-lang=en")
];

export const getParameterNames = () => {
    return supportedRepositories.map(repo => repo.parameterName);
}

export const getModel = async (parameterName, parameter) => {
    const repository = supportedRepositories.find(repo => repo.parameterName == parameterName);

    const response = await fetch(repository.getDownloadUrl(parameter));
    if (!response.ok) throw response.status;

    return Promise.resolve(response.text());
}
