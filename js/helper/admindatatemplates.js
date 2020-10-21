const template = string => new DOMParser().parseFromString(string, "text/xml").documentElement;

export const getAdminData = studyOID => template(`
    <AdminData StudyOID="${studyOID}">
    </AdminData>
`);

export const getUser = (oid, firstName, lastName, locationRef) => template(`
    <User OID="${oid}">
        <DisplayName>${lastName}, ${firstName}</DisplayName>
        <FirstName>${firstName}</FirstName>
        <LastName>${lastName}</LastName>
        <LocationRef>${locationRef}</LocationRef>
    </User>
`);

export const getSite = (oid, studyOID, metadataVersionOID, date) => template(`
    <Location OID="${oid}" Name="New Site" LocationType="Site">
        <MetaDataVersionRef StudyOID="${studyOID}" MetaDataVersionOID="${metadataVersionOID}" EffectiveDate="${date}"></MetaDataVersionRef>
    </Location>
`);
