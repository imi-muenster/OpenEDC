const template = string => new DOMParser().parseFromString(string, "text/xml").documentElement;

export const getAdminData = studyOID => template(`
    <AdminData StudyOID="${studyOID}">
    </AdminData>
`);

export const getUser = (oid, firstName, lastName) => template(`
    <User OID="${oid}">
        <DisplayName>${lastName}, ${firstName}</DisplayName>
        <FirstName>${firstName}</FirstName>
        <LastName>${lastName}</LastName>
        <LocationRef></LocationRef>
    </User>
`);

export const getLocation = (oid, name, studyOID, metadataVersionOID, date) => template(`
    <Location OID="${oid}" Name="${name}" LocationType="Site">
        <MetaDataVersionRef StudyOID="${studyOID}" MetaDataVersionOID="${metadataVersionOID}" EffectiveDate="${date}"></MetaDataVersionRef>
    </Location>
`);
