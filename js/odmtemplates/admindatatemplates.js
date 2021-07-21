const template = string => new DOMParser().parseFromString(string, "text/xml").documentElement;

export const getAdminData = () => template(`
    <AdminData>
    </AdminData>
`);

export const getUser = (oid, firstName, lastName) => template(`
    <User OID="${oid}">
        <FirstName>${firstName.escapeXML()}</FirstName>
        <LastName>${lastName.escapeXML()}</LastName>
    </User>
`);

export const getSite = (oid, name, studyOID, metadataVersionOID, date) => template(`
    <Location OID="${oid}" Name="${name}" LocationType="Site">
        <MetaDataVersionRef StudyOID="${studyOID}" MetaDataVersionOID="${metadataVersionOID}" EffectiveDate="${date}"></MetaDataVersionRef>
    </Location>
`);

export const getLocationRef = locationOID => template(`
    <LocationRef LocationOID="${locationOID}"/>
`);
