import { BrandAnalysis, ToneProfile } from "@/lib/types";

type ScrapedPage = {
  url: string;
  text: string;
};

function collectText(pages: ScrapedPage[]): string {
  return pages
    .map((p) => p.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function countMatches(text: string, regex: RegExp): number {
  return (text.match(regex) || []).length;
}

function brandLabelFromUrl(sourceUrl: string): string {
  try {
    const normalized = sourceUrl.startsWith("http") ? sourceUrl : `https://${sourceUrl}`;
    const host = new URL(normalized).hostname.replace(/^www\./i, "");
    const first = host.split(".")[0] || "this brand";
    return first.charAt(0).toUpperCase() + first.slice(1);
  } catch {
    return "This brand";
  }
}

function detectFormality(text: string): string {
  const casual = countMatches(text, /\b(you|your|don'?t|we're|we’ve|let's|easy)\b/gi);
  const technical = countMatches(
    text,
    /\b(hypoallergenic|biodegradable|formulation|compliance|ingredient|certified|enzyme|ph\b|surfactant)\b/gi
  );
  if (casual > technical * 1.2) return "Professional but friendly";
  if (technical > casual * 1.2) return "Formal / technical-leaning";
  return "Balanced conversational";
}

function detectPersonality(text: string): string {
  const caring = countMatches(text, /\b(family|safe|gentle|care|pets|kids)\b/gi);
  const expert = countMatches(text, /\b(doctor|chemist|tested|science|certified|phd|laboratory)\b/gi);
  const eco = countMatches(text, /\b(plant|sustainable|recycl|biobased|waste|planet|carbon)\b/gi);

  const tags: string[] = [];
  if (caring > 3) tags.push("Caring");
  if (expert > 3) tags.push("Expert-backed");
  if (eco > 3) tags.push("Eco-conscious");
  return tags.length ? tags.join(" + ") : "Benefit-led and practical";
}

function detectStyle(text: string): string {
  const clarity = countMatches(text, /\b(works|safe|gentle|effective|ingredients|transparent)\b/gi);
  const hype = countMatches(text, /\b(amazing|best ever|magical|miracle|game[- ]changer|#\s*1)\b/gi);
  if (clarity >= hype) return "Clarity-first, benefit-led";
  return "Emotion-led with selective hype";
}

function extractProofSignals(text: string): string[] {
  const signals: string[] = [];
  const snippets = [
    /(\d[\d,\.]*\+?\s*(five-star reviews|reviews))/i,
    /(\d[\d,\.]*\+?\s*(million|m)\s*(bottles|customers|plastic bottles))/i,
    /(USDA\s*biobased)/i,
    /(PETA\s*(cruelty[- ]free)?)/i,
    /(doctor|chemist|phd)/i
  ];
  for (const pattern of snippets) {
    const match = text.match(pattern);
    if (match?.[0]) signals.push(match[0].trim());
  }
  return [...new Set(signals)].slice(0, 5);
}

function detectCtaStyle(text: string): string {
  const strong = countMatches(text, /\b(shop now|add to cart|start|subscribe|get|buy)\b/gi);
  const weak = countMatches(text, /\b(learn more|submit|click here)\b/gi);
  return strong >= weak ? "Action-oriented ecommerce CTAs" : "Mixed or softer CTAs";
}

function buildToneProfile(text: string): ToneProfile {
  return {
    formality: detectFormality(text),
    personality: detectPersonality(text),
    style: detectStyle(text),
    proofSignals: extractProofSignals(text),
    ctaStyle: detectCtaStyle(text)
  };
}

/** Prefer a sentence-like chunk that looks like body copy, not nav chrome. */
function pickSubstantiveSnippet(fullText: string, max = 200): string | null {
  const cleaned = fullText.replace(/\s+/g, " ").trim();
  const parts = cleaned.split(/(?<=[.!?])\s+/);
  const skip = /^(cart|menu|search|cookie|accept|close|skip|sign in|log in)/i;
  for (const part of parts) {
    const p = part.trim();
    if (p.length < 50) continue;
    if (skip.test(p)) continue;
    if (/^[\d\s$€£]+$/.test(p)) continue;
    return p.length <= max ? p : `${p.slice(0, max - 1)}…`;
  }
  return clipEvidence(cleaned, max);
}

function clipEvidence(text: string, max = 160): string | null {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length < 40) return null;
  return cleaned.length <= max ? cleaned : `${cleaned.slice(0, max - 1)}…`;
}

function scoreAxes(text: string) {
  const t = text;
  return {
    technical:
      countMatches(
        t,
        /\b(enzyme|protease|lipase|amylase|ph\s*\d|ph-|surfactant|formulation|ingredient|concentrat|biobased|preservative|hypoallergenic)\b/gi
      ),
    founderStory:
      countMatches(
        t,
        /\b(founder|our story|we started|mission|why we|i started|family-owned|co-founder)\b/gi
      ),
    educational:
      countMatches(
        t,
        /\b(how (it )?works|why|because|learn|guide|faq|explained|science|research)\b/gi
      ),
    warm:
      countMatches(
        t,
        /\b(thank|love|welcome|appreciate|grateful|happy to|we care|kind)\b/gi
      ),
    transparentNuanced:
      countMatches(
        t,
        /\b(transparent|trade-?off|however|full disclosure|no hidden|honest|limits? of|not suitable|if you|when to)\b/gi
      ),
    serviceNotPushy:
      countMatches(
        t,
        /\b(you don'?t need|lightly soiled|optional|try|consider|alternative|instead of|no need to)\b/gi
      ),
    salesy:
      countMatches(
        t,
        /\b(limited time|act now|hurry|best[- ]selling|#\s*1|guarantee|money[- ]back|risk[- ]free)\b/gi
      ),
    community:
      countMatches(
        t,
        /\b(community|together|families|share|feedback|reviews|join us|newsletter)\b/gi
      ),
    proof:
      countMatches(
        t,
        /\b(award|featured|as seen|study|tested|certified|verified|review)\b/gi
      )
  };
}

function openingParagraph(brand: string, text: string, axes: ReturnType<typeof scoreAxes>): string {
  const knowledgeable =
    axes.technical >= 4 || axes.educational >= 5
      ? "highly knowledgeable and educational"
      : axes.educational >= 2
        ? "informative and explanatory"
        : "clear and direct";
  const service =
    axes.serviceNotPushy > axes.salesy
      ? "service-oriented rather than hard-sell"
      : axes.salesy > 3
        ? "conversion-aware, with promotional emphasis"
        : "balanced between persuasion and usefulness";
  const warmth =
    axes.warm >= 3 ? "warm and approachable" : "measured and professional";
  const stance =
    axes.founderStory >= 2
      ? "a mix of expert voice and founder-led storytelling"
      : axes.proof >= 4
        ? "authority and proof-led, with an emphasis on credibility"
        : "practical and outcome-focused";

  const evidenceSource = pickSubstantiveSnippet(text);
  const evidenceClause = evidenceSource
    ? ` Representative on-page language includes: “${evidenceSource}”`
    : "";

  const tail = evidenceClause ? `${evidenceClause}—which anchors the voice in observable copy patterns.` : "";
  return `**${brand}** writes in a ${knowledgeable}, ${service} tone that reads as ${warmth}. The overall stance feels like ${stance}.${tail}`;
}

function personalityStance(brand: string, text: string, axes: ReturnType<typeof scoreAxes>): string {
  const expert =
    axes.technical >= 5
      ? `**Clear expert energy:** The site goes into specifics where it helps credibility—ingredients, mechanisms, certifications, or how products are meant to behave in real use—not only headline benefits.`
      : axes.technical >= 2
        ? `**Practical specificity:** Copy mixes plain-language benefits with occasional technical anchors (ingredients, standards, or “how it works” framing).`
        : `**Accessible positioning:** The voice stays mostly non-technical, prioritizing outcomes and reassurance over deep formulation detail.`;

  const founder =
    axes.founderStory >= 2
      ? `**Founder / origin story:** There are signals of a human-led brand—why the product exists, who it’s for, or what problem sparked the line—rather than anonymous corporate voice.`
      : `**Brand-forward, less personal:** The narrative centers on the product and category more than an individual founder arc.`;

  const push =
    axes.serviceNotPushy > axes.salesy
      ? `**Service-first tilt:** Language sometimes frames choices as optional or contextual (“when you need it,” comparisons, or gentle guidance), which can feel less aggressive than pure retail hype.`
      : axes.salesy > 4
        ? `**Promotional cadence:** Strong retail cues (urgency, superlatives, guarantees) show up regularly—useful for conversion, less “quiet expert.”`
        : `**Standard ecommerce balance:** Benefits and CTAs are present without extreme hype or extreme restraint.`;

  return [expert, founder, push].join("\n\n");
}

function emotionalTone(text: string, axes: ReturnType<typeof scoreAxes>): string {
  const warm =
    axes.warm >= 3
      ? "Warm and appreciative language appears in places—thanks, encouragement, or community-oriented phrasing—so the brand can feel human rather than purely transactional."
      : "Emotional warmth is relatively restrained; the voice stays more neutral and informational.";
  const trust =
    axes.transparentNuanced >= 3
      ? "There are hints of **nuance and transparency**—acknowledging trade-offs, limits, or “when this applies” rather than flattening everything into a slogan."
      : "Nuanced trade-off language is lighter; the site mostly stacks benefits and reassurance.";
  const hasApology = /\b(sorry|apologize|unfortunate|delay|issue|inconvenient)\b/i.test(text);
  const apology = hasApology
    ? "When things go wrong (shipping, stock, or service), copy sometimes acknowledges friction directly, which reads as accountable rather than defensive."
    : "";
  return [warm, trust, apology].filter(Boolean).join("\n\n");
}

function languageStyle(text: string, axes: ReturnType<typeof scoreAxes>): string {
  const casual = countMatches(text, /\b(hey|haha|you know|let's|we're|it's)\b/gi);
  const precise = axes.technical >= 4;
  const conversational =
    casual >= 2
      ? "Conversational micro-moments show up alongside product claims—short asides, informal connectors, or plain-spoken explanations."
      : "The register stays fairly polished and retail-standard, with fewer colloquial flourishes.";
  const vocab =
    precise
      ? "Vocabulary **mixes accessible benefits with technical terms** where the brand needs to signal seriousness (ingredients, standards, performance claims)."
      : "Vocabulary stays mostly **plain and benefit-led**, with limited jargon on the surface.";
  const marketing =
    axes.transparentNuanced >= 3
      ? "Where it’s strongest, the voice explains mechanism or context—not only “what” the product does, but **why that should matter** to the reader."
      : "Explanations skew toward **outcome headlines** more than deep “why it works” essays—typical for category pages and above-the-fold space.";

  return [conversational, vocab, marketing].join("\n\n");
}

function communicationOnSite(text: string, axes: ReturnType<typeof scoreAxes>): string {
  const faq = /\b(faq|frequently asked|questions)\b/i.test(text);
  const how = /\b(how to use|how it works|steps? \d)\b/i.test(text);
  const miniEssay =
    faq || how || axes.educational >= 4
      ? "The site often behaves like a **compact education layer**: FAQs, how-to steps, or ingredient explainers that walk readers through reasoning—not only commands to buy."
      : "Educational depth is present but not dominant; pages may rely more on hero claims, grids, and product cards.";
  const cta =
    axes.serviceNotPushy > axes.salesy
      ? "Calls-to-action are still present (it is ecommerce), but surrounding copy sometimes **earns the click** with guidance, comparisons, or qualifiers."
      : "Calls-to-action are **front-and-center**—the page rhythm is optimized for shopping actions as the primary next step.";
  const proof =
    axes.proof >= 3
      ? "Proof is woven in via reviews, badges, press mentions, counts, or certifications—supporting claims without requiring the reader to take everything on faith."
      : "Proof signals are lighter on the surface; the argument leans more on brand promise and product copy.";

  return [miniEssay, cta, proof].join("\n\n");
}

function relationshipAudience(text: string, axes: ReturnType<typeof scoreAxes>): string {
  const family = /\b(family|kids|baby|pet|parent|home)\b/i.test(text);
  const pro = /\b(professional|business|enterprise|team)\b/i.test(text);
  const sensitive = /\b(sensitive|eczema|allergy|hypoallergenic|skin)\b/i.test(text);
  const segments: string[] = [];
  if (family) segments.push("households and family routines");
  if (sensitive) segments.push("people prioritizing gentler formulas or sensitivities");
  if (pro) segments.push("more formal buyer contexts");
  const segText =
    segments.length > 0
      ? `The implied reader is often **${segments.join("; ")}**.`
      : "The implied reader is a **general category buyer**—the site does not narrow to a single niche persona on the surface.";

  const community =
    axes.community >= 4
      ? "There’s a **community or social-proof posture**: reviews, shared values, or “join us” language that frames the brand as part of a lifestyle or movement."
      : "Community language is moderate; credibility comes more from product proof points and brand claims than from a highly participatory voice.";

  const feedback =
    /\b(feedback|tell us|contact|support)\b/i.test(text)
      ? "Contact and support pathways suggest the brand treats customer input as operational input—not just a support ticket."
      : null;

  return [segText, community, feedback].filter(Boolean).join("\n\n");
}

function mirrorToneBullets(axes: ReturnType<typeof scoreAxes>): string[] {
  const bullets: string[] = [];
  bullets.push(
    "Lead with **gratitude and clarity**—acknowledge the reader’s constraints (time, sensitivity, skepticism) early."
  );
  if (axes.technical >= 3) {
    bullets.push(
      "Explain **one layer of mechanism** (why something works) for every big benefit claim—especially if you sell in a skeptical category."
    );
  } else {
    bullets.push(
      "Pair each benefit with a **specific, testable detail** (ingredient class, standard, usage context) so claims feel grounded."
    );
  }
  if (axes.transparentNuanced >= 2 || axes.serviceNotPushy >= 2) {
    bullets.push(
      "Name **trade-offs and limits** where honest: it increases trust and reduces refund friction later."
    );
  }
  if (axes.salesy > axes.serviceNotPushy) {
    bullets.push(
      "If you mirror this site’s promotional cadence, keep **one calm, expert paragraph** on each key page to balance hype."
    );
  } else {
    bullets.push(
      "Keep a **service-first line** visible: when the product is optional, say so—readers often reward that honesty with loyalty."
    );
  }
  bullets.push(
    "Close sections with **practical next steps** (how much, how often, what to try first)—not only a button."
  );
  return bullets.slice(0, 6);
}

function positioningSnapshotTable(
  sourceUrl: string,
  pagesScanned: string[],
  tone: ToneProfile,
  text: string
): string {
  const audience = /\b(family|kids|pet|sensitive|eczema)\b/i.test(text)
    ? "Family- and sensitivity-oriented shoppers (inferred)"
    : "Broad category buyers (inferred)";
  const pricing = (text.match(/\$\s?\d+(?:\.\d{2})?/g) || []).slice(0, 4);
  const priceRow =
    pricing.length > 0 ? `Observed price cues: ${[...new Set(pricing)].join(", ")}` : "No price tokens detected in scraped text";

  return [
    "### Positioning snapshot (quick reference)",
    "",
    "| Dimension | Findings |",
    "|---|---|",
    `| Source | \`${sourceUrl}\` — ${pagesScanned.length} page(s) scraped |`,
    `| Voice (summary) | ${tone.formality}; ${tone.personality}; ${tone.style} |`,
    `| CTAs | ${tone.ctaStyle} |`,
    `| Audience signals | ${audience} |`,
    `| Commercial cues | ${priceRow} |`,
    `| Proof on page | ${tone.proofSignals.join("; ") || "None strongly detected"} |`,
    ""
  ].join("\n");
}

function synthesisClosing(brand: string, axes: ReturnType<typeof scoreAxes>): string {
  const nerd = axes.technical >= 4;
  const founder = axes.founderStory >= 2;
  const humble = axes.transparentNuanced >= 2;
  const parts: string[] = [];
  if (nerd) parts.push("technically credible");
  if (founder) parts.push("founder-tinged");
  if (humble) parts.push("transparent about real-world constraints");
  const label = parts.length ? parts.join(", ") : "practical and reader-aware";

  return `All together, **${brand}** comes across as a **${label}** brand voice on the site: it uses ecommerce structure, but the *texture* of the language suggests how they want to be trusted—through specificity, proof, and (where present) human context rather than pure spectacle.`;
}

function buildAnalysisMarkdown(params: {
  sourceUrl: string;
  pagesScanned: string[];
  tone: ToneProfile;
  combinedText: string;
}): string {
  const { sourceUrl, pagesScanned, tone, combinedText } = params;
  const brand = brandLabelFromUrl(sourceUrl);
  const axes = scoreAxes(combinedText);

  const sections = [
    "## Structure analysis",
    "",
    openingParagraph(brand, combinedText, axes),
    "",
    "### Overall personality and stance",
    "",
    personalityStance(brand, combinedText, axes),
    "",
    "### Tone of voice",
    "",
    "#### Emotional tone",
    "",
    emotionalTone(combinedText, axes),
    "",
    "#### Language style",
    "",
    languageStyle(combinedText, axes),
    "",
    "### Communication style on the site",
    "",
    communicationOnSite(combinedText, axes),
    "",
    "### Relationship to the audience",
    "",
    relationshipAudience(combinedText, axes),
    "",
    "### If you wanted to mirror this tone",
    "",
    ...mirrorToneBullets(axes).map((b) => `- ${b}`),
    "",
    synthesisClosing(brand, axes),
    "",
    positioningSnapshotTable(sourceUrl, pagesScanned, tone, combinedText)
  ];

  return sections.join("\n");
}

export function analyzeBrand(sourceUrl: string, pages: ScrapedPage[]): BrandAnalysis {
  const combinedText = collectText(pages);
  const tone = buildToneProfile(combinedText);

  return {
    sourceUrl,
    pagesScanned: pages.map((p) => p.url),
    toneSummary: tone,
    analysisMarkdown: buildAnalysisMarkdown({
      sourceUrl,
      pagesScanned: pages.map((p) => p.url),
      tone,
      combinedText
    })
  };
}
