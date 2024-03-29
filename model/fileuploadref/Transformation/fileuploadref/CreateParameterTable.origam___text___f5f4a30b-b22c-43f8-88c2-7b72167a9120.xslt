﻿<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0"
	xmlns:AS="http://schema.advantages.cz/AsapFunctions"
	xmlns:date="http://exslt.org/dates-and-times" exclude-result-prefixes="AS date">

	<xsl:param name="rowid" />
	<xsl:param name="entityid" />
	<xsl:template match="ROOT">
		<ROOT>
			<ParameterTable Id="{AS:GenerateId()}" RowId="{$rowid}" EntityId="{$entityid}"/>
		</ROOT>
	</xsl:template>
</xsl:stylesheet>