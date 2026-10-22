# Übersicht: Use Cases und Changes

> **Nicht manuell bearbeiten.** Diese Datei wird mit `node scripts/features-overview.ts` aus dem Frontmatter
> der Beschreibungen in `features/` erzeugt (`name`, `type`, `epics`, `state`). Änderungen gehören in die
> jeweilige Beschreibung; danach das Skript erneut ausführen.

## Nach Status

Zuerst die offenen, dann die zurückgestellten, danach die erledigten, jeweils nach Name sortiert.

| Name | Status | Typ |
| --- | --- | --- |
| [api-user-pfade](changes/api-user-pfade.md) | open | change |
| [report-links](changes/report-links.md) | open | change |
| [mcp-verwalte-feiertage](changes/mcp-verwalte-feiertage.md) | later | change |
| [mcp-yearly-report](changes/mcp-yearly-report.md) | later | change |
| [holiday](use-case/holiday.md) | resolved | story |
| [local-environment](boundaries/local-environment.md) | resolved | setup |
| [mcp-enable](boundaries/mcp-enable.md) | resolved | story |
| [mcp-token](boundaries/mcp-token.md) | resolved | story |
| [monthly-report](use-case/monthly-report.md) | resolved | story |
| [sick-leave](use-case/sick-leave.md) | resolved | story |
| [time-stamp](use-case/time-stamp.md) | resolved | story |
| [today-report](use-case/today-report.md) | resolved | story |
| [weekly-report](use-case/weekly-report.md) | resolved | story |
| [weekly-report-krank](changes/weekly-report-krank.md) | resolved | change |
| [yearly-report](use-case/yearly-report.md) | resolved | story |

## Nach Epic

Nach Epic sortiert, das Epic steht nur in der ersten Zeile seiner Gruppe. Innerhalb eines Epics die offenen zuerst,
dann nach Name. Eine Beschreibung mit mehreren Epics steht bei jedem ihrer Epics.

| Epic | Name | Typ | Status |
| --- | --- | --- | --- |
| api | [api-user-pfade](changes/api-user-pfade.md) | change | open |
| berechtigungen | [api-user-pfade](changes/api-user-pfade.md) | change | open |
|  | [mcp-token](boundaries/mcp-token.md) | story | resolved |
| entwicklung | [local-environment](boundaries/local-environment.md) | setup | resolved |
| feiertage | [mcp-verwalte-feiertage](changes/mcp-verwalte-feiertage.md) | change | later |
|  | [holiday](use-case/holiday.md) | story | resolved |
| krankmeldung | [sick-leave](use-case/sick-leave.md) | story | resolved |
|  | [weekly-report-krank](changes/weekly-report-krank.md) | change | resolved |
| mcp | [mcp-verwalte-feiertage](changes/mcp-verwalte-feiertage.md) | change | later |
|  | [mcp-yearly-report](changes/mcp-yearly-report.md) | change | later |
|  | [mcp-enable](boundaries/mcp-enable.md) | story | resolved |
|  | [mcp-token](boundaries/mcp-token.md) | story | resolved |
| report | [report-links](changes/report-links.md) | change | open |
|  | [mcp-yearly-report](changes/mcp-yearly-report.md) | change | later |
|  | [monthly-report](use-case/monthly-report.md) | story | resolved |
|  | [today-report](use-case/today-report.md) | story | resolved |
|  | [weekly-report](use-case/weekly-report.md) | story | resolved |
|  | [weekly-report-krank](changes/weekly-report-krank.md) | change | resolved |
|  | [yearly-report](use-case/yearly-report.md) | story | resolved |
| zeiterfassung | [time-stamp](use-case/time-stamp.md) | story | resolved |
|  | [today-report](use-case/today-report.md) | story | resolved |
