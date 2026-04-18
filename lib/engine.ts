export type ModelKey = "gpt4" | "claude" | "gemini" | "llama";
export type TaskType = "coding" | "research" | "reasoning" | "creative" | "general";

export type ModelPersona = {
  name: string;
  provider: string;
  color: string;
  style: string;
  modelId?: string;
};

export type ModelScore = {
  accuracy: number;
  reasoning: number;
  coherence: number;
  completeness: number;
  safety: number;
  semantic_similarity: number;
  grounding_score: number;
  contradiction_count: number;
  contradiction_pairs: string[];
  hallucination_risk: "low" | "medium" | "high";
  hallucination_count: number;
  bias_score: number;
  bias_type: string;
  key_claims: string[];
  strengths: string[];
  weaknesses: string[];
  evaluator: string;
  model_profile: string;
  consensus_score?: number;
  _overall?: number;
  _taskType?: TaskType;
};

export type ScoresByModel = Record<ModelKey, ModelScore>;
export type ResponsesByModel = Record<ModelKey, string>;

export const MODEL_PERSONAS: Record<ModelKey, ModelPersona> = {
  gpt4: {
    name: "GPT-4o",
    provider: "OpenAI",
    color: "#10a37f",
    style: "structured, concise, fact-focused"
  },
  claude: {
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    modelId: "claude-3-5-sonnet-20241022",
    color: "#cc785c",
    style: "careful, nuanced, uncertainty-aware reasoning"
  },
  gemini: {
    name: "Gemini 2.5 Pro",
    provider: "Google",
    modelId: "gemini-2.5-pro",
    color: "#4285f4",
    style: "contextual, long-context, reasoning-focused"
  },
  llama: {
    name: "Llama 3",
    provider: "Meta",
    color: "#a855f7",
    style: "practical, accessible, implementation-oriented"
  }
};

export const DIMENSIONS = ["Accuracy", "Reasoning", "Coherence", "Completeness", "Safety"];

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "can", "for", "from", "how",
  "in", "into", "is", "it", "of", "on", "or", "should", "that", "the", "this",
  "to", "what", "when", "where", "which", "who", "why", "with", "would", "you"
]);

const TASK_WEIGHTS: Record<TaskType, { accuracy: number; reasoning: number; coherence: number; completeness: number; safety: number }> = {
  coding:    { accuracy: 0.35, reasoning: 0.30, coherence: 0.15, completeness: 0.15, safety: 0.05 },
  research:  { accuracy: 0.40, reasoning: 0.25, coherence: 0.15, completeness: 0.15, safety: 0.05 },
  reasoning: { accuracy: 0.20, reasoning: 0.50, coherence: 0.15, completeness: 0.10, safety: 0.05 },
  creative:  { accuracy: 0.10, reasoning: 0.15, coherence: 0.40, completeness: 0.25, safety: 0.10 },
  general:   { accuracy: 0.25, reasoning: 0.25, coherence: 0.25, completeness: 0.20, safety: 0.05 }
};

const ENTAILMENT_PAIRS = [
  ["yes", "no"],
  ["true", "false"],
  ["increase", "decrease"],
  ["safe", "unsafe"],
  ["possible", "impossible"],
  ["always", "never"],
  ["all", "none"],
  ["required", "optional"]
];

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function normalizeToken(token: string) {
  return token
    .replace(/ies$/, "y")
    .replace(/ing$/, "")
    .replace(/ed$/, "")
    .replace(/s$/, "");
}

function tokenize(text: string) {
  return String(text).toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map(normalizeToken)
    .filter(token => token.length > 2 && !STOPWORDS.has(token));
}

function ngrams(tokens: string[], size: number) {
  const output: string[] = [];
  for (let i = 0; i <= tokens.length - size; i++) {
    output.push(tokens.slice(i, i + size).join(" "));
  }
  return output;
}

function jaccardSimilarity(left: string[], right: string[]) {
  const a = new Set(left);
  const b = new Set(right);
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter(item => b.has(item)).length;
  const union = new Set([...a, ...b]).size;
  return intersection / union;
}

function keywordSet(text: string) {
  return new Set(tokenize(text));
}

function sentenceSplit(text: string) {
  return String(text)
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean);
}

function cosineSimilarity(a: string, b: string) {
  const left = tokenize(a);
  const right = tokenize(b);
  if (!left.length || !right.length) return 0;
  const counts = new Map<string, number>();
  left.forEach(token => counts.set(token, (counts.get(token) || 0) + 1));
  let dot = 0;
  const rightCounts = new Map<string, number>();
  right.forEach(token => rightCounts.set(token, (rightCounts.get(token) || 0) + 1));
  rightCounts.forEach((count, token) => {
    dot += count * (counts.get(token) || 0);
  });
  const leftNorm = Math.sqrt(left.reduce((sum, token) => sum + Math.pow(counts.get(token) || 0, 2), 0));
  const rightNorm = Math.sqrt(right.reduce((sum, token) => sum + Math.pow(rightCounts.get(token) || 0, 2), 0));
  return leftNorm && rightNorm ? dot / (leftNorm * rightNorm) : 0;
}

function semanticSimilarity(a: string, b: string) {
  const left = tokenize(a);
  const right = tokenize(b);
  const unigram = cosineSimilarity(a, b);
  const bigram = jaccardSimilarity(ngrams(left, 2), ngrams(right, 2));
  const trigram = jaccardSimilarity(ngrams(left, 3), ngrams(right, 3));
  return unigram * 0.70 + bigram * 0.20 + trigram * 0.10;
}

function coverageScore(query: string, response: string) {
  const queryTerms = keywordSet(query);
  if (!queryTerms.size) return 60;
  const responseTerms = keywordSet(response);
  const covered = [...queryTerms].filter(term => responseTerms.has(term)).length;
  return clamp((covered / queryTerms.size) * 100);
}

function extractClaims(response: string) {
  const factualMarkers = /\b(is|are|was|were|means|causes|requires|produces|shows|uses|contains|costs|must|will|because)\b/i;
  return sentenceSplit(response)
    .filter(sentence => factualMarkers.test(sentence) || /\d/.test(sentence))
    .slice(0, 5);
}

function detectContradictions(response: string) {
  const tokens = new Set(tokenize(response));
  const pairs = ENTAILMENT_PAIRS.filter(([left, right]) => tokens.has(left) && tokens.has(right));
  const hedgedNegation = /\b(can|may|might|usually)\b[^.!?]{0,80}\b(not|cannot|can't|won't)\b/i.test(response);
  return {
    contradiction_count: Math.min(5, pairs.length + (hedgedNegation ? 1 : 0)),
    contradiction_pairs: pairs.map(pair => pair.join(" vs "))
  };
}

function detectBias(response: string) {
  const text = response.toLowerCase();
  const categories: Record<string, string[]> = {
    political: ["liberal", "conservative", "left-wing", "right-wing", "propaganda", "agenda"],
    cultural: ["western", "eastern", "traditional", "modern society", "culture war"],
    commercial: ["best product", "buy", "sponsor", "market leader", "guaranteed"],
    temporal: ["always", "never", "obsolete", "future-proof", "permanent"]
  };
  let biasType = "none";
  let score = 0;
  Object.entries(categories).forEach(([type, words], index) => {
    const hits = words.filter(word => text.includes(word)).length;
    if (hits > 0) {
      biasType = type;
      score += hits * (index % 2 === 0 ? 11 : -11);
    }
  });
  if (/\b(obviously|everyone knows|undeniably|no reasonable person)\b/i.test(response)) {
    score += score >= 0 ? 14 : -14;
    if (biasType === "none") biasType = "cultural";
  }
  return { bias_score: Math.max(-50, Math.min(50, score)), bias_type: biasType };
}

function detectHallucination(query: string, response: string) {
  const claims = extractClaims(response);
  const querySimilarity = semanticSimilarity(query, response);
  const redFlags = [
    /\b(recent studies|experts agree|research proves|statistics show)\b/i,
    /\b\d{4}\b/,
    /\b(guaranteed|always|never|definitely|without exception)\b/i,
    /\[[0-9]+\]|\bdoi:|https?:\/\//i
  ];
  const unsupportedClaims = claims.filter(claim => semanticSimilarity(query, claim) < 0.12);
  const redFlagCount = redFlags.filter(pattern => pattern.test(response)).length;
  const hallucination_count = Math.min(5, unsupportedClaims.length + redFlagCount);
  const grounding_score = clamp(100 - hallucination_count * 14 + querySimilarity * 30);
  const hallucination_risk: "low" | "medium" | "high" =
    hallucination_count >= 4 ? "high" : hallucination_count >= 2 ? "medium" : "low";
  return { hallucination_risk, hallucination_count, grounding_score, key_claims: claims.slice(0, 3) };
}

function consensusScore(response: string, peerResponses: string[]) {
  const peers = peerResponses.filter(Boolean);
  if (!peers.length) return 70;
  const avgSimilarity = peers.reduce((sum, peer) => sum + semanticSimilarity(response, peer), 0) / peers.length;
  return clamp(35 + avgSimilarity * 85);
}

function buildLocalResponse(modelKey: ModelKey, query: string, taskType: TaskType) {
  const persona = MODEL_PERSONAS[modelKey];
  const keywords = [...keywordSet(query)].slice(0, 5).join(", ") || "the prompt";
  const taskLead = {
    coding: "A strong coding answer should define the algorithm, handle edge cases, and include complexity notes.",
    research: "A strong research answer should separate established facts from uncertain or evolving claims.",
    reasoning: "A strong reasoning answer should make each inference explicit and avoid jumping from partial evidence to a universal conclusion.",
    creative: "A strong creative answer should keep the central image vivid while staying coherent.",
    general: "A strong answer should be direct, balanced, and clear about uncertainty."
  }[taskType] || "A strong answer should be direct and useful.";

  const variants: Record<ModelKey, string[]> = {
    gpt4: [
      `**Direct answer:** ${taskLead}`,
      `For "${query}", focus on ${keywords}.`,
      "Recommended structure: state the answer, explain the reasoning, then list caveats or validation steps.",
      "Avoid adding unsupported dates, citations, or named facts unless they can be checked."
    ],
    claude: [
      `**Careful answer:** ${taskLead}`,
      `The safest approach is to answer "${query}" by distinguishing what follows from the prompt from what would require outside verification.`,
      "I would evaluate competing responses by checking claim support, missing assumptions, internal consistency, and possible framing bias.",
      "[NOTE] Any highly specific factual claim should be verified against a trusted source before final use."
    ],
    gemini: [
      `**Contextual answer:** ${taskLead}`,
      `Think of the task around ${keywords} as a comparison problem: which response is relevant, grounded, complete, and understandable?`,
      "A practical rubric is accuracy first, reasoning second, then coherence, completeness, and safety.",
      "Examples and edge cases are useful, but they should not outrun the evidence in the original prompt."
    ],
    llama: [
      `**Practical answer:** Start with the answer to "${query}", then improve it step by step.`,
      taskLead,
      "Keep the final result easy to use: short sections, concrete checks, and no overconfident claims.",
      "If two responses disagree, prefer the one that explains its assumptions and can be validated."
    ]
  };

  if (taskType === "coding" && /prime|sieve/i.test(query)) {
    variants.gpt4.push("```js\nfunction primesUpTo(n) {\n  const isPrime = Array(n + 1).fill(true);\n  isPrime[0] = isPrime[1] = false;\n  for (let p = 2; p * p <= n; p++) {\n    if (isPrime[p]) for (let m = p * p; m <= n; m += p) isPrime[m] = false;\n  }\n  return isPrime.map((ok, i) => ok ? i : null).filter(Number.isInteger);\n}\n```");
    variants.claude.push("Time complexity is O(n log log n), and space complexity is O(n). Guard `n < 2` in production code.");
  }

  return `${variants[modelKey].join("\n\n")}\n\n_Adapter: ${persona.provider} profile (${persona.style})._`;
}

function scoreHeuristics(modelKey: ModelKey, response: string, query: string, taskType: TaskType): ModelScore {
  const semantic = clamp(semanticSimilarity(query, response) * 100);
  const coverage = coverageScore(query, response);
  const grounding = detectHallucination(query, response);
  const bias = detectBias(response);
  const contradiction = detectContradictions(response);
  const sentences = sentenceSplit(response);
  const wordCount = tokenize(response).length;
  const hasReasoning = /\b(because|therefore|so|if|then|trade-off|assumption|edge case|step)\b/i.test(response);
  const hasCode = /```|function|class|return|for\s*\(|while\s*\(/i.test(response);
  const uncertainty = /\b(may|might|likely|uncertain|verify|caveat|depends)\b/i.test(response);
  const unsafe = /\b(hack|exploit|weapon|self-harm|illegal)\b/i.test(response);

  const accuracy = clamp(coverage * 0.42 + semantic * 0.24 + grounding.grounding_score * 0.30 - contradiction.contradiction_count * 4);
  const reasoning = clamp(52 + (hasReasoning ? 24 : 0) + (taskType === "reasoning" ? 8 : 0) + Math.min(sentences.length * 3, 16) - contradiction.contradiction_count * 5);
  const coherence = clamp(68 + (sentences.length >= 3 ? 12 : 0) + (/\*\*|:/.test(response) ? 8 : 0) - (wordCount > 260 ? 8 : 0));
  const completeness = clamp(45 + Math.min(wordCount / 2, 28) + coverage * 0.18 + (taskType === "coding" && hasCode ? 12 : 0));
  const safety = clamp(92 - Math.abs(bias.bias_score) * 0.45 - grounding.hallucination_count * 5 - contradiction.contradiction_count * 4 - (unsafe ? 30 : 0) + (uncertainty ? 4 : 0));

  const strengths: string[] = [];
  if (coverage >= 70) strengths.push("Covers the main prompt terms");
  if (hasReasoning) strengths.push("Shows reasoning or validation steps");
  if (grounding.hallucination_risk === "low") strengths.push("Low hallucination risk");
  if (!strengths.length) strengths.push("Readable baseline answer");

  const weaknesses: string[] = [];
  if (semantic < 35) weaknesses.push("Limited semantic overlap with the prompt");
  if (grounding.hallucination_risk !== "low") weaknesses.push("Contains claims that need verification");
  if (Math.abs(bias.bias_score) > 20) weaknesses.push("Potential framing bias detected");
  if (contradiction.contradiction_count) weaknesses.push("Possible internal contradiction detected");
  if (!weaknesses.length) weaknesses.push("No major heuristic weakness detected");

  return {
    accuracy,
    reasoning,
    coherence,
    completeness,
    safety,
    semantic_similarity: semantic,
    grounding_score: grounding.grounding_score,
    contradiction_count: contradiction.contradiction_count,
    contradiction_pairs: contradiction.contradiction_pairs,
    hallucination_risk: grounding.hallucination_risk,
    hallucination_count: grounding.hallucination_count,
    bias_score: bias.bias_score,
    bias_type: bias.bias_type,
    key_claims: grounding.key_claims,
    strengths: strengths.slice(0, 2),
    weaknesses: weaknesses.slice(0, 2),
    evaluator: "local-nlp-heuristic",
    model_profile: MODEL_PERSONAS[modelKey].style
  };
}

function topSentences(response: string, query: string, limit = 2) {
  return sentenceSplit(response)
    .map(sentence => ({
      sentence: sentence.replace(/\*\*/g, "").replace(/^[-*\s]+/, "").trim(),
      score: semanticSimilarity(query, sentence) +
        (/\b(verify|because|therefore|edge case|assumption|grounded|bias|evidence)\b/i.test(sentence) ? 0.12 : 0) -
        (/\b(always|never|guaranteed|definitely)\b/i.test(sentence) ? 0.08 : 0)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.sentence);
}

type HistoryEntry = {
  id: number;
  query: string;
  taskType: TaskType;
  topModel: string;
  confidence: number;
  timestamp: string;
};

export const Engine = {
  history: [] as HistoryEntry[],

  async getModelResponse(modelKey: ModelKey, query: string, taskType: TaskType) {
    return Promise.resolve(buildLocalResponse(modelKey, query, taskType));
  },

  async scoreResponse(modelKey: ModelKey, response: string, query: string, taskType: TaskType) {
    const scores = scoreHeuristics(modelKey, response, query, taskType);
    scores._taskType = taskType;
    return Promise.resolve(scores);
  },

  addConsensusScores(scores: ScoresByModel, responses: ResponsesByModel, taskType: TaskType = "general") {
    (Object.keys(scores) as ModelKey[]).forEach(modelKey => {
      const peers = Object.entries(responses)
        .filter(([key]) => key !== modelKey)
        .map(([, response]) => response);
      scores[modelKey].consensus_score = consensusScore(responses[modelKey], peers);
      scores[modelKey]._overall = this.computeOverallScore(scores[modelKey], scores[modelKey]._taskType || taskType);
    });
    return scores;
  },

  async synthesize(query: string, responses: ResponsesByModel, scores: ScoresByModel, taskType: TaskType) {
    this.addConsensusScores(scores, responses, taskType);
    const ranked = Object.entries(scores)
      .map(([key, score]) => ({ key: key as ModelKey, score: score._overall || this.computeOverallScore(score, taskType) }))
      .sort((a, b) => b.score - a.score);

    const best = ranked[0];
    const runnerUp = ranked[1] ?? ranked[0];
    const selected = [...new Set([
      ...topSentences(responses[best.key], query, 2),
      ...topSentences(responses[runnerUp.key], query, 1)
    ])].slice(0, 3);

    const risk = Object.values(scores).some(score => score.hallucination_risk === "high") ? "high" :
      Object.values(scores).some(score => score.hallucination_risk === "medium") ? "medium" : "low";
    const confidence = this.computeConfidence(scores);
    const agreement = clamp(ranked.reduce((sum, item) => sum + (scores[item.key].consensus_score || 70), 0) / ranked.length);

    const keyFindings = ranked.slice(0, 3).map(item => {
      const model = MODEL_PERSONAS[item.key].name;
      const score = scores[item.key];
      return `${model}: ${item.score}/100 overall, ${score.grounding_score}/100 grounding, ${score.hallucination_risk} hallucination risk`;
    });

    return [
      "**Synthesized answer**",
      `**Query:** ${query}`,
      "**Best combined response:**",
      ...selected.map(sentence => `- ${sentence}`),
      "- Final calibration: keep claims tied to the prompt, prefer reasoning with stated assumptions, and verify specific external facts before relying on them.",
      "**Model ranking evidence:**",
      ...keyFindings.map(item => `- ${item}`),
      `**Consensus:** ${agreement}/100 cross-model agreement. Ensemble winner: ${MODEL_PERSONAS[best.key].name}, with supporting signal from ${MODEL_PERSONAS[runnerUp.key].name}.`,
      risk === "low"
        ? "Hallucination filter: no major unsupported-claim pattern was detected by the local grounding checks."
        : "[NOTE] Hallucination filter: at least one response contained claims that should be verified before final use.",
      `Confidence summary: ${confidence}% confidence based on weighted quality scores and cross-model agreement.`
    ].join("\n\n");
  },

  computeOverallScore(scores: ModelScore, taskType: TaskType) {
    const weights = TASK_WEIGHTS[taskType] || TASK_WEIGHTS.general;
    return clamp(
      scores.accuracy * weights.accuracy +
      scores.reasoning * weights.reasoning +
      scores.coherence * weights.coherence +
      scores.completeness * weights.completeness +
      scores.safety * weights.safety +
      ((scores.consensus_score || 70) - 70) * 0.08 -
      (scores.contradiction_count || 0) * 2
    );
  },

  computeConfidence(allScores: ScoresByModel) {
    const overallScores = Object.values(allScores).map(score => score._overall || this.computeOverallScore(score, "general"));
    if (!overallScores.length) return 0;
    const avg = overallScores.reduce((a, b) => a + b, 0) / overallScores.length;
    const variance = overallScores.reduce((sum, score) => sum + Math.pow(score - avg, 2), 0) / overallScores.length;
    const stdDev = Math.sqrt(variance);
    const groundingAvg = Object.values(allScores).reduce((sum, score) => sum + (score.grounding_score || 70), 0) / overallScores.length;
    const consensusAvg = Object.values(allScores).reduce((sum, score) => sum + (score.consensus_score || 70), 0) / overallScores.length;
    return clamp(avg * 0.48 + groundingAvg * 0.24 + consensusAvg * 0.14 + (100 - stdDev * 2) * 0.14);
  },

  addToHistory(query: string, taskType: TaskType, topModel: string, confidence: number) {
    this.history.unshift({
      id: Date.now(),
      query: query.slice(0, 100),
      taskType,
      topModel,
      confidence,
      timestamp: new Date().toLocaleTimeString()
    });
    if (this.history.length > 20) this.history.pop();
  }
};
