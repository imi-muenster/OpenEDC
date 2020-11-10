<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:odm="http://www.cdisc.org/ns/odm/v1.3">
    <xsl:param name="formOID"/>
    <xsl:param name="locale"/>
    <xsl:param name="textAsTextarea"/>
    <xsl:template match="/">
        <div id="odm-html-content">
            <xsl:for-each select="//odm:FormDef[@OID=$formOID]/odm:ItemGroupRef">
                <xsl:variable name="itemGroupOID" select="@ItemGroupOID"/>
                <xsl:call-template name="itemGroupDescription">
                    <xsl:with-param name="itemGroup" select="//odm:ItemGroupDef[@OID=$itemGroupOID]"/>
                </xsl:call-template>
                <xsl:for-each select="//odm:ItemGroupDef[@OID=$itemGroupOID]/odm:ItemRef">
                    <div class="preview-field" preview-field-oid="{@ItemOID}" preview-field-group-oid="{$itemGroupOID}" mandatory="{@Mandatory}">
                        <xsl:variable name="itemOID" select="@ItemOID"/>
                        <xsl:call-template name="itemQuestion">
                            <xsl:with-param name="item" select="//odm:ItemDef[@OID=$itemOID]"/>
                            <xsl:with-param name="mandatory" select="@Mandatory"/>
                        </xsl:call-template>
                        <xsl:call-template name="itemInput">
                            <xsl:with-param name="item" select="//odm:ItemDef[@OID=$itemOID]"/>
                            <xsl:with-param name="itemGroupOID" select="$itemGroupOID"/>
                        </xsl:call-template>
                    </div>
                </xsl:for-each>
                <hr/>
            </xsl:for-each>
        </div>
    </xsl:template>
    <xsl:template name="itemGroupDescription">
        <xsl:param name="itemGroup"/>
        <h2 class="subtitle">
            <xsl:value-of select="$itemGroup/odm:Description/odm:TranslatedText[@xml:lang=$locale]"/>
        </h2>
    </xsl:template>
    <xsl:template name="itemQuestion">
        <xsl:param name="item"/>
        <xsl:param name="mandatory"/>
        <label class="label">
            <xsl:value-of select="$item/odm:Question/odm:TranslatedText[@xml:lang=$locale]"/>
            <xsl:if test="$mandatory = 'Yes'"> (*)</xsl:if>
        </label>
    </xsl:template>
    <xsl:template name="itemInput">
        <xsl:param name="item"/>
        <xsl:param name="itemGroupOID"/>
        <xsl:choose>
            <xsl:when test="$item/odm:CodeListRef">
                <div class="field">
                    <xsl:variable name="codeListOID" select="$item/odm:CodeListRef/@CodeListOID"/>
                    <xsl:call-template name="codeList">
                        <xsl:with-param name="codeList" select="//odm:CodeList[@OID=$codeListOID]"/>
                        <xsl:with-param name="item" select="$item"/>
                        <xsl:with-param name="itemGroupOID" select="$itemGroupOID"/>
                    </xsl:call-template>
                </div>
            </xsl:when>
            <xsl:when test="$item/@DataType = 'boolean'">
                <div class="field">
                    <xsl:call-template name="booleanField">
                        <xsl:with-param name="item" select="$item"/>
                        <xsl:with-param name="itemGroupOID" select="$itemGroupOID"/>
                    </xsl:call-template>
                </div>
            </xsl:when>
            <xsl:when test="$item/odm:MeasurementUnitRef">
                <div class="field has-addons">
                    <div class="control is-expanded">
                        <xsl:call-template name="input">
                            <xsl:with-param name="item" select="$item"/>
                            <xsl:with-param name="itemGroupOID" select="$itemGroupOID"/>
                        </xsl:call-template>
                    </div>
                    <xsl:variable name="measurementUnitOID" select="$item/odm:MeasurementUnitRef/@MeasurementUnitOID"/>
                    <xsl:call-template name="measurementUnit">
                        <xsl:with-param name="measurementUnit" select="//odm:MeasurementUnit[@OID=$measurementUnitOID]"/>
                    </xsl:call-template>
                </div>
            </xsl:when>
            <xsl:otherwise>
                <div class="field">
                    <xsl:call-template name="input">
                        <xsl:with-param name="item" select="$item"/>
                        <xsl:with-param name="itemGroupOID" select="$itemGroupOID"/>
                    </xsl:call-template>
                </div>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    <xsl:template name="codeList">
        <xsl:param name="codeList"/>
        <xsl:param name="item"/>
        <xsl:param name="itemGroupOID"/>
        <xsl:choose>
            <xsl:when test="count($codeList/odm:CodeListItem) >= 10">
                <div class="select is-fullwidth">
                    <select type="select" preview-oid="{$item/@OID}" preview-group-oid="{$itemGroupOID}">
                        <option value=""></option>
                        <xsl:for-each select="$codeList/odm:CodeListItem">
                            <xsl:variable name="value" select="./odm:Decode/odm:TranslatedText[@xml:lang=$locale]"/>
                            <option value="{@CodedValue}"><xsl:value-of select="$value"/></option>
                        </xsl:for-each>
                    </select>
                </div>
            </xsl:when>
            <xsl:otherwise>
                <xsl:for-each select="$codeList/odm:CodeListItem">
                    <xsl:variable name="value" select="./odm:Decode/odm:TranslatedText[@xml:lang=$locale]"/>
                    <label class="radio"><input type="radio" name="{$itemGroupOID}-{$item/@OID}" preview-oid="{$item/@OID}" preview-group-oid="{$itemGroupOID}" value="{@CodedValue}"/>&#160;<xsl:value-of select="$value"/></label>
                    <br/>
                </xsl:for-each>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    <xsl:template name="booleanField">
        <xsl:param name="item"/>
        <xsl:param name="itemGroupOID"/>
        <xsl:choose>
            <xsl:when test="$locale = 'de'">
                <label class="radio"><input type="radio" name="{$item/@OID}" preview-oid="{$item/@OID}" preview-group-oid="{$itemGroupOID}" value="1"/>&#160;Ja</label><br/>
                <label class="radio"><input type="radio" name="{$item/@OID}" preview-oid="{$item/@OID}" preview-group-oid="{$itemGroupOID}" value="0"/>&#160;Nein</label>
            </xsl:when>
            <xsl:otherwise>
                <label class="radio"><input type="radio" name="{$item/@OID}" preview-oid="{$item/@OID}" preview-group-oid="{$itemGroupOID}" value="1"/>&#160;Yes</label><br/>
                <label class="radio"><input type="radio" name="{$item/@OID}" preview-oid="{$item/@OID}" preview-group-oid="{$itemGroupOID}" value="0"/>&#160;No</label>            
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    <xsl:template name="measurementUnit">
        <xsl:param name="measurementUnit"/>
        <div class="control">
            <a class="button is-static"><xsl:value-of select="$measurementUnit/odm:Symbol/odm:TranslatedText[@xml:lang=$locale]"/></a>
        </div>
    </xsl:template>
    <xsl:template name="input">
        <xsl:param name="item"/>
        <xsl:param name="itemGroupOID"/>
        <xsl:choose>
            <xsl:when test="$item/@DataType = 'date'">
                <input class="input" type="date" preview-oid="{$item/@OID}" preview-group-oid="{$itemGroupOID}"/>
            </xsl:when>
            <xsl:when test="$item/@DataType = 'integer'">
                <input class="input" type="text" inputmode="numeric" preview-oid="{$item/@OID}" preview-group-oid="{$itemGroupOID}"/>
            </xsl:when>
            <xsl:when test="$item/@DataType = 'float'">
                <input class="input" type="text" inputmode="decimal" preview-oid="{$item/@OID}" preview-group-oid="{$itemGroupOID}"/>
            </xsl:when>
            <xsl:when test="$item/@DataType = 'text' and $textAsTextarea = 'true'">
                <textarea class="textarea" preview-oid="{$item/@OID}" preview-group-oid="{$itemGroupOID}"></textarea>
            </xsl:when>
            <xsl:otherwise>
                <input class="input" type="text" preview-oid="{$item/@OID}" preview-group-oid="{$itemGroupOID}"/>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
</xsl:stylesheet>
