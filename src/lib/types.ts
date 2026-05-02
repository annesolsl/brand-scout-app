export type ToneProfile = {
  formality: string;
  personality: string;
  style: string;
  proofSignals: string[];
  ctaStyle: string;
};

export type BrandAnalysis = {
  sourceUrl: string;
  pagesScanned: string[];
  /** Long-form structure analysis (markdown): narrative sections + snapshot table */
  analysisMarkdown: string;
  toneSummary: ToneProfile;
};
