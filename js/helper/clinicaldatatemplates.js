const template = string => new DOMParser().parseFromString(string, "text/xml").documentElement;

export const getClinicalData = (studyOID, metadataVersionOID) => template(`
    <ClinicalData StudyOID="${studyOID}" MetaDataVersionOID="${metadataVersionOID}">
    </ClinicalData>
`);

export const getSubjectData = subjectKey => template(`
    <SubjectData SubjectKey="${subjectKey}">
    </SubjectData>
`);

export const getStudyEventData = studyEventOID => template(`
    <StudyEventData StudyEventOID="${studyEventOID}">
    </StudyEventData>
`);

export const getFormData = formOID => template(`
    <FormData FormOID="${formOID}">
    </FormData>
`);

export const getItemGroupData = itemGroupOID => template(`
    <ItemGroupData ItemGroupOID="${itemGroupOID}">
    </ItemGroupData>
`);

export const getItemData = (itemOID, value) => template(`
    <ItemData ItemOID="${itemOID}" Value="${value}"/>
`);

export const getAuditRecord = (userOID, locationOID, dateTimeStamp) => template(`
    <AuditRecord>
        <UserRef UserOID="${userOID}"/>
        <LocationRef LocationOID="${locationOID}"/>
        <DateTimeStamp>${dateTimeStamp}</DateTimeStamp>
    </AuditRecord>
`);

export const getSiteRef = locationOID => template(`
    <SiteRef LocationOID="${locationOID}"/>
`);
