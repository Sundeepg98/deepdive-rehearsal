// Compile-time schema validation for a parsed topic (the parse_md.mjs output).
// Mirrors the rules the post-build topic_contract gate enforces, but fails fast
// at the .md with a clear message naming the topic and the offending field --
// so an authoring mistake surfaces as "topic X: drill has 5 cards, needs 18"
// instead of a silent drop or a late gate failure.
import { z } from 'zod';

const TOPIC_GROUPS = [
  'messaging-events', 'data-storage', 'reliability-observability',
  'platform-infra', 'architecture-apis', 'security-tenancy',
];
const CORE_TIERS = ['SDE2', 'SDE3', 'Staff'];

const identity = z.object({
  index: z.number().int().positive(),
  total: z.number().int().positive(),
  locatorTail: z.string().min(1, 'locatorTail is required'),
  group: z.enum(TOPIC_GROUPS),
  title: z.string().min(1, 'title is required'),
  h1: z.string().min(1, 'h1 is required'),
  thesis: z.string().min(1, 'thesis is required'),
  sub: z.string(),
  spine: z.array(z.string()),
  cramTitle: z.string(),
  reportTitle: z.string(),
  companionTopic: z.string(),
  cmpNotes: z.record(z.string(), z.array(z.string())),
});

const drillCard = z.object({
  tier: z.string().min(1, 'a drill card is missing its tier'),
  signal: z.string().min(1, 'every drill card needs a signal'),
  q: z.string().min(1, 'every drill card needs a q'),
  a: z.string(),
  f: z.array(z.object({ q: z.string(), a: z.string() })),
  senior: z.string(),
});

const drill = z.object({
  cards: z.array(drillCard).min(18, 'drill needs at least 18 cards (target 21)'),
}).superRefine((d, ctx) => {
  const counts = {};
  for (const c of d.cards) counts[c.tier] = (counts[c.tier] || 0) + 1;
  for (const tier of CORE_TIERS) {
    if ((counts[tier] || 0) < 3) {
      ctx.addIssue({
        code: 'custom',
        path: ['cards'],
        message: 'drill tier ' + tier + ' has ' + (counts[tier] || 0) + ' cards, needs at least 3',
      });
    }
  }
});

const topicSchema = z.object({
  id: z.string().min(1, 'frontmatter id is required'),
  prefix: z.string().min(1, 'frontmatter prefix is required'),
  identity,
  views: z.object({ drill }).loose(),
});

// Throw a clear, author-facing error if a parsed topic violates the contract.
export function validateTopic(parsed, label) {
  const name = label || (parsed && parsed.id) || 'topic';
  const r = topicSchema.safeParse(parsed);
  if (!r.success) {
    const lines = r.error.issues.map(
      (i) => '  - ' + (i.path.join('.') || '(root)') + ': ' + i.message,
    );
    throw new Error('topic "' + name + '" failed schema validation:\n' + lines.join('\n'));
  }
}
