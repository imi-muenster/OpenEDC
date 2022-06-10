const template = string => new DOMParser().parseFromString(string, "text/xml").documentElement;

export const getClinicalData = (studyOID, metadataVersionOID) => template(`
    <ClinicalData StudyOID="${studyOID}" MetaDataVersionOID="${metadataVersionOID}">
    </ClinicalData>
`);

export const getSubjectData = subjectKey => template(`
    <SubjectData SubjectKey="${subjectKey}">
    </SubjectData>
`);

export const getStudyEventData = (studyEventOID, studyEventRepeatKey) => template(`
    <StudyEventData StudyEventOID="${studyEventOID}" ${studyEventRepeatKey ? `StudyEventRepeatKey="${studyEventRepeatKey}"` : ""}>
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
    <ItemData ItemOID="${itemOID}" Value="${value.escapeXML()}"/>
`);

// The ODM specification currently requires a LocationRef within an AuditRecord which is not always applicable
// Therefore, a dash is inserted when the subject/user is not assigned to a site
export const getAuditRecord = (userOID, locationOID, dateTimeStamp) => template(`
    <AuditRecord>
        <UserRef UserOID="${userOID}"/>
        <LocationRef LocationOID="${locationOID || '-'}"/>
        <DateTimeStamp>${dateTimeStamp}</DateTimeStamp>
    </AuditRecord>
`);

export const getSiteRef = locationOID => template(`
    <SiteRef LocationOID="${locationOID}"/>
`);

// SeqNum always set to 1 since there will be only one flag for a parent entity (i.e., a form)
export const getFlag = (flagValue, codeListOID) => template(`
    <Annotation SeqNum="1">
        <Flag>
            <FlagValue CodeListOID="${codeListOID}">${flagValue}</FlagValue>
        </Flag>
    </Annotation>
`);
