let template = string => new DOMParser().parseFromString(string, "text/xml").documentElement;

export let getClinicalData = (studyOID, metadataVersionOID) => template(`
    <ClinicalData StudyOID="${studyOID}" MetadataVersionOID="${metadataVersionOID}">
    </ClinicalData>
`);

export let getSubjectData = subjectKey => template(`
    <SubjectData SubjectKey="${subjectKey}" TransactionType="Insert">
    </SubjectData>
`);
