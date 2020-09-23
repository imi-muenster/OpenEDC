let template = string => new DOMParser().parseFromString(string, "text/xml").documentElement;

export let getClinicalData = (studyOID, metadataVersionOID) => template(`
    <ClinicalData StudyOID="${studyOID}" MetadataVersionOID="${metadataVersionOID}">
    </ClinicalData>
`);

export let getSubjectData = subjectKey => template(`
    <SubjectData SubjectKey="${subjectKey}">
    </SubjectData>
`);

export let getStudyEventData = studyEventOID => template(`
    <StudyEventData StudyEventOID="${studyEventOID}">
    </StudyEventData>
`);

export let getFormData = formOID => template(`
    <FormData FormOID="${formOID}">
    </FormData>
`);

export let getItemGroupData = itemGroupOID => template(`
    <ItemGroupData ItemGroupOID="${itemGroupOID}">
    </ItemGroupData>
`);

export let getItemData = (itemOID, value) => template(`
    <ItemData ItemOID="${itemOID}" Value="${value}"/>
`);
