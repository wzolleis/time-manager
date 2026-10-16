// netlify/functions/lib/rule-error.ts
// Eine verletzte Regel aus shared/ (Meldung eines check…-Service). Wird innerhalb einer Transaktion
// geworfen, damit sie zurückgerollt wird, und im catch der Function zu 422 umgewandelt.
export class RuleError extends Error {}

export const ruleViolation = (err: RuleError) => Response.json({error: err.message}, {status: 422});
