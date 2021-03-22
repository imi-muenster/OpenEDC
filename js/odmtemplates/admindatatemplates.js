const template = string => new DOMParser().parseFromString(string, "text/xml").documentElement;

export const getAdminData = () => template(`
    <AdminData>
    </AdminData>
`);

export const getUser = (oid) => template(`
    <User OID="${oid}">
        <FirstName>New</FirstName>
        <LastName>User</LastName>
    </User>
`);

export const getSite = (oid, studyOID, metadataVersionOID, date) => template(`
    <Location OID="${oid}" Name="New Site" LocationType="Site">
        <MetaDataVersionRef StudyOID="${studyOID}" MetaDataVersionOID="${metadataVersionOID}" EffectiveDate="${date}"></MetaDataVersionRef>
    </Location>
`);

export const getLocationRef = locationOID => template(`
    <LocationRef LocationOID="${locationOID}"/>
`);
