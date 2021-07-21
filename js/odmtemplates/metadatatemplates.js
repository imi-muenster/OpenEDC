let template = string => new DOMParser().parseFromString(string, "text/xml").documentElement;

export let getCodeListRef = oid => template(`
    <CodeListRef CodeListOID="${oid}"/>
`);

export let getCodeListDef = oid => template(`
    <CodeList OID="${oid}" Name="${oid}" DataType="text">
    </CodeList>
`);

export let getCodeListItem = (codedValue) => template(`
    <CodeListItem CodedValue="${codedValue}">
    </CodeListItem>
`);

export let getDecode = () => template(`
    <Decode>
    </Decode>
`);

export let getDescription = () => template(`
    <Description>
    </Description>
`);

export let getQuestion = () => template(`
    <Question>
    </Question>
`);

export let getTranslatedText = (text, locale) => template(`
    <TranslatedText xml:lang="${locale}">${text.escapeXML()}</TranslatedText>
`);

export let getItemRef = oid => template(`
    <ItemRef ItemOID="${oid}" Mandatory="No"/>
`);

export let getItemDef = (oid, name) => template(`
    <ItemDef OID="${oid}" Name="${name}" DataType="integer">
    </ItemDef>
`);

export let getItemGroupRef = oid => template(`
    <ItemGroupRef ItemGroupOID="${oid}" Mandatory="No"/>
`);

export let getItemGroupDef = (oid, name) => template(`
    <ItemGroupDef OID="${oid}" Name="${name}" Repeating="No">
    </ItemGroupDef>
`);

export let getFormRef = oid => template(`
    <FormRef FormOID="${oid}" Mandatory="No"/>
`);

export let getFormDef = (oid, name) => template(`
    <FormDef OID="${oid}" Name="${name}" Repeating="No">
    </FormDef>
`);

export let getStudyEventRef = oid => template(`
    <StudyEventRef StudyEventOID="${oid}" Mandatory="No"/>
`);

export let getStudyEventDef = (oid, name) => template(`
    <StudyEventDef OID="${oid}" Name="${name}" Repeating="No" Type="Common">
    </StudyEventDef>
`);

export let getProtocol = () => template(`
    <Protocol>
    </Protocol>
`);

export let getODMTemplate = () => {
    let template = `<?xml version="1.0" encoding="UTF-8"?>
                        <ODM xmlns="http://www.cdisc.org/ns/odm/v1.3" FileType="Snapshot" FileOID="" CreationDateTime="" ODMVersion="1.3.2" SourceSystem="OpenEDC">
                            <Study OID="S.1">
                                <GlobalVariables>
                                    <StudyName>New Project</StudyName>
                                    <StudyDescription></StudyDescription>
                                    <ProtocolName>New Project</ProtocolName>
                                </GlobalVariables>
                                <MetaDataVersion OID="MDV.1" Name="MetaDataVersion">
                                    <Protocol>
                                    </Protocol>
                                </MetaDataVersion>
                            </Study>
                        </ODM>
    `;

    return new DOMParser().parseFromString(template, "text/xml");
}

export let getAlias = (context, name) => template(`
    <Alias Context="${context.escapeXML()}" Name="${name.escapeXML()}"/>
`);

// Since ODM only provides a CollectionExceptionCondition, but a CollectionCondition is much more user friendly, the expression is negated
export let getConditionDef = (oid, name, description, locale, formalExpression) => template(`
    <ConditionDef OID="${oid}" Name="${name}">
        <Description>
            <TranslatedText xml:lang="${locale}">${description.escapeXML()}</TranslatedText>
        </Description>
        <FormalExpression Context="OpenEDC">!(${formalExpression.escapeXML()})</FormalExpression>
    </ConditionDef>
`);

export let getMethodDef = (oid, name, description, locale, formalExpression) => template(`
    <MethodDef OID="${oid}" Name="${name}" Type="Computation">
        <Description>
            <TranslatedText xml:lang="${locale}">${description.escapeXML()}</TranslatedText>
        </Description>
        <FormalExpression Context="OpenEDC">${formalExpression.escapeXML()}</FormalExpression>
    </MethodDef>
`);

export let getMeasurementUnitRef = (oid) => template(`
    <MeasurementUnitRef MeasurementUnitOID="${oid}"/>
`);

export let getMeasurementUnitDef = (oid, name, symbol, locale) => template(`
    <MeasurementUnit OID="${oid}" Name="${name}">
        <Symbol>
            <TranslatedText xml:lang="${locale}">${symbol.escapeXML()}</TranslatedText>
        </Symbol>
    </MeasurementUnit>
`);

export let getRangeCheck = (comparator, checkValue) => template(`
    <RangeCheck Comparator="${comparator}" SoftHard="Hard">
        <CheckValue>${checkValue}</CheckValue>
    </RangeCheck>
`);

export let getBasicDefintions = () => template(`
    <BasicDefinitions>
    </BasicDefinitions>
`);
