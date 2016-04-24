<?xml version="1.0"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

<xsl:template match="/">
	<xsl:apply-templates select="boxscore"/>
</xsl:template>

<xsl:template match="boxscore">
	<table cellpadding="0" cellspacing="0">
	<tr>
	<td class="BoxScoreHead" style="text-align: left;">
		&#xa0;
	</td>
	<xsl:for-each select="linescore/inning_line_score">
		<th class="BoxScoreHead">
		&#xa0;<xsl:number />&#xa0;
		</th>
	</xsl:for-each>
	<th class="BoxScoreHead">&#xa0;</th>
	<th class="BoxScoreHead">&#xa0;&#xa0;R&#xa0;&#xa0;</th>
	<th class="BoxScoreHead">&#xa0;&#xa0;H&#xa0;&#xa0;</th>
	<th class="BoxScoreHead">&#xa0;&#xa0;E&#xa0;&#xa0;</th>
	</tr>
	<tr>
	<td class="BoxScore" style="text-align: left;">
		<B><xsl:value-of select="@away_sname"/>&#xa0;</B>
	</td>
	<xsl:for-each select="linescore/inning_line_score">
		<td class="BoxScore">
		<xsl:value-of select="@away"/>
		</td>
	</xsl:for-each>
	<th class="BoxScore">&#xa0;</th>
	<th class="BoxScore" style="background-color: #F0F0F0;">
		<xsl:choose>
		<xsl:when test="linescore/@away_team_runs">
			<xsl:value-of select="linescore/@away_team_runs"/>
		</xsl:when>
		<xsl:otherwise>-</xsl:otherwise>
		</xsl:choose>
	</th>
	<th class="BoxScore">
		<xsl:choose>
		<xsl:when test="linescore/@away_team_hits">
			<xsl:value-of select="linescore/@away_team_hits"/>
		</xsl:when>
		<xsl:otherwise>-</xsl:otherwise>
		</xsl:choose>
	</th>
	<th class="BoxScore">
		<xsl:choose>
		<xsl:when test="linescore/@away_team_errors">
			<xsl:value-of select="linescore/@away_team_errors"/>
		</xsl:when>
		<xsl:otherwise>-</xsl:otherwise>
		</xsl:choose>
	</th>
	</tr>
	<tr>
	<td class="BoxScore" style="text-align: left;">
		<B><xsl:value-of select="@home_sname"/>&#xa0;</B>
	</td>
	<xsl:for-each select="linescore/inning_line_score">
		<td class="BoxScore">
		&#xa0;<xsl:value-of select="@home"/>&#xa0;
		</td>
	</xsl:for-each>
	<th class="BoxScore">&#xa0;</th>
	<th class="BoxScore" style="background-color: #F0F0F0;">
		<xsl:choose>
		<xsl:when test="linescore/@home_team_runs">
			<xsl:value-of select="linescore/@home_team_runs"/>
		</xsl:when>
		<xsl:otherwise>-</xsl:otherwise>
		</xsl:choose>
	</th>
	<th class="BoxScore">
		<xsl:choose>
		<xsl:when test="linescore/@home_team_hits">
			<xsl:value-of select="linescore/@home_team_hits"/>
		</xsl:when>
		<xsl:otherwise>-</xsl:otherwise>
		</xsl:choose>
	</th>
	<th class="BoxScore">
		<xsl:choose>
		<xsl:when test="linescore/@home_team_errors">
			<xsl:value-of select="linescore/@home_team_errors"/>
		</xsl:when>
		<xsl:otherwise>-</xsl:otherwise>
		</xsl:choose>
	</th>
	</tr>
	</table>
	<b>Status: </b>
	<xsl:choose>
	<xsl:when test="@status_ind='P'">Pre-Game</xsl:when>
	<xsl:when test="@status_ind='PR'">Rain Delay</xsl:when>
	<xsl:when test="@status_ind='PW'">Pre-Game/Warm-up</xsl:when>
	<xsl:when test="@status_ind='I'">In Progress</xsl:when>
	<xsl:when test="@status_ind='F'">Final</xsl:when>
	<xsl:otherwise>TRANSLATE THIS CODE: <xsl:value-of select="@status_ind"/></xsl:otherwise>
	</xsl:choose>
	<xsl:if test="links/@home_preview !='' and status/@status = 'Preview'">
	<xsl:value-of select="' '"/><a><xsl:attribute name="HREF">http://www.mlb.com<xsl:value-of select="links/@home_preview"/></xsl:attribute>(<xsl:value-of select="@home_team_name"/>)</a> 
	</xsl:if>
	<xsl:if test="links/@away_preview !='' and status/@status = 'Preview'">
	<xsl:value-of select="' '"/><a><xsl:attribute name="HREF">http://www.mlb.com<xsl:value-of select="links/@away_preview"/></xsl:attribute>(<xsl:value-of select="@away_team_name"/>)</a>
	</xsl:if>
	<xsl:if test="status/@status = 'Final' and winning_pitcher"> <B> WP: </B>
		<xsl:value-of select="winning_pitcher/@first"/><xsl:value-of select="' '"/>
		<xsl:value-of select="winning_pitcher/@last"/>
	</xsl:if>
	<xsl:if test="status/@status = 'Final' and losing_pitcher"> <B> LP: </B>
		<xsl:value-of select="losing_pitcher/@first"/><xsl:value-of select="' '"/>
		<xsl:value-of select="losing_pitcher/@last"/>
	</xsl:if>
	<xsl:if test="links/@wrapup !='' and status/@status = 'Final'">
		<xsl:value-of select="' '"/><a><xsl:attribute name="HREF">http://www.mlb.com<xsl:value-of select="links/@wrapup"/></xsl:attribute>(Wrap Up)</a>
	</xsl:if>
	<br/>
	<xsl:apply-templates select="home_probable_pitcher" mode="Pitcher">
		<xsl:with-param name="TeamName">
			<xsl:value-of select="@home_team_name"/>
		</xsl:with-param>
	</xsl:apply-templates>
	<xsl:apply-templates select="away_probable_pitcher" mode="Pitcher">
		<xsl:with-param name="TeamName">
			<xsl:value-of select="@away_team_name"/>
		</xsl:with-param>
	</xsl:apply-templates>
</xsl:template>

<xsl:template match="*" mode="Pitcher">
	<xsl:param name="TeamName" select="''"/>
	<xsl:value-of select="' '"/>
	<xsl:value-of select="$TeamName"/> Pitcher:
	<xsl:value-of select="@first"/>
	<xsl:value-of select="' '"/>
	<xsl:value-of select="@last"/>
	(<xsl:value-of select="@std_wins"/>-<xsl:value-of select="@std_losses"/>,
	<xsl:value-of select="@std_era"/>)

</xsl:template>

</xsl:stylesheet>
