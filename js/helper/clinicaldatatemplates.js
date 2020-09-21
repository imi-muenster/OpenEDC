let template = string => new DOMParser().parseFromString(string, "text/xml").documentElement;

export let getSubjectData = oid => template(`
    <CodeListRef CodeListOID="${oid}"/>
`);
