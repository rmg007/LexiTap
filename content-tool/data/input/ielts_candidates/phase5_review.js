export const meta = {
  name: 'ielts-phase5-review',
  description: 'Adversarial post-enrichment review of 2855 enriched IELTS words',
  phases: [
    { title: 'Review' },
    { title: 'Verify' },
  ],
}

const CHUNK_DIR = '/private/tmp/claude-501/-Users-ryan-Desktop-LexiTap/42f6734b-bab3-4c41-ada4-60a444e9be91/scratchpad'
const N = 8

const FINDINGS_SCHEMA = {
  type: 'object',
  properties: {
    reviewed: { type: 'number' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          word: { type: 'string' },
          issue_type: { type: 'string', enum: ['explicit_content', 'proper_noun', 'duplicate_definition_near_synonym', 'broken_quiz_question', 'wrong_or_nonsensical_definition', 'other'] },
          description: { type: 'string' },
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
        required: ['word', 'issue_type', 'description', 'severity'],
      },
    },
  },
  required: ['reviewed', 'findings'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    real: { type: 'boolean' },
    reason: { type: 'string' },
  },
  required: ['real', 'reason'],
}

phase('Review')
const chunkIdx = Array.from({ length: N }, (_, i) => i)
const reviews = await parallel(
  chunkIdx.map((i) => () =>
    agent(
      `Read the JSON file at ${CHUNK_DIR}/ielts_review_chunk_${i}.json — it's an array of enriched IELTS vocabulary word records (word, pos, definition, example_sentence, theme, synonyms, antonyms, senses[], questions[]) for a 13+ ESL vocab app called LexiTap. This is a book-derived curated IELTS exam word list — most words are legitimately advanced/academic vocabulary, so do NOT flag ordinary difficulty. Only flag REAL defects: (1) explicit/inappropriate content unsuitable for 13+ learners, (2) proper nouns that slipped in (people/place/brand names, not generic vocabulary), (3) two different words in the list with near-duplicate definitions that would confuse quiz distractors, (4) broken quiz questions (correct answer not in options, nonsensical options, or a question that doesn't test the word), (5) a definition or example sentence that is simply wrong or nonsensical for the word. Report every word you reviewed as 'reviewed' count, and only genuine defects as findings — empty findings array is a fine and expected result if the chunk is clean.`,
      { label: `review:chunk${i}`, phase: 'Review', schema: FINDINGS_SCHEMA }
    )
  )
)

const allFindings = reviews.filter(Boolean).flatMap((r) => r.findings || [])
const totalReviewed = reviews.filter(Boolean).reduce((sum, r) => sum + (r.reviewed || 0), 0)
log(`Reviewed ${totalReviewed} words across ${N} chunks, ${allFindings.length} raw findings`)

phase('Verify')
const verified = await parallel(
  allFindings.map((f) => () =>
    agent(
      `Adversarially verify this content-review finding on an IELTS vocabulary word for a 13+ ESL app. Finding: word="${f.word}", issue_type="${f.issue_type}", severity="${f.severity}", description="${f.description}". Read ${CHUNK_DIR}/ielts_review_chunk_0.json through chunk_7.json (whichever contains "${f.word}") to see the actual record, then judge: is this a REAL, actionable defect (real=true) or a false positive / overly cautious flag on legitimate advanced vocabulary (real=false)? Default to real=false unless the defect is concrete and verifiable in the data.`,
      { label: `verify:${f.word}`, phase: 'Verify', schema: VERDICT_SCHEMA }
    ).then((v) => ({ ...f, verdict: v }))
  )
)

const confirmed = verified.filter(Boolean).filter((f) => f.verdict?.real)
return { totalReviewed, rawFindings: allFindings.length, confirmed }
