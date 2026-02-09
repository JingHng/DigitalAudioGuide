const saveAs = (content: string, filename: string, mime: string) => {
  const blob = new Blob([content], { type: mime });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export interface NormalizedReview {
  feedback_id: number;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at?: string | null;
  is_hidden?: boolean;
  user_id?: number | null;
  exhibit_id?: number | null;
  username?: string;
  exhibitName?: string;
  description?: string | null;
  status?: 'shown' | 'hidden';
  user?: {
    user_id?: number | null;
    username?: string | null;
    email?: string | null;
  };
  exhibit?: {
    exhibit_id?: number | null;
    title?: string | null;
    description?: string | null;
  };
  exhibition?: {
    title?: string | null;
  };
  has_comment: boolean;
  text_length: number;
  sentiment_score: number;
  sentiment_label: 'positive' | 'neutral' | 'negative';
  response_status: 'commented' | 'rating_only' | 'hidden';
}

export interface ReviewAnalyticsPayload {
  summary: {
    total_reviews: number;
    average_rating: number;
    hidden_count: number;
    shown_count: number;
    commented_count: number;
    response_rate: number;
  };
  rating_distribution: { rating: number; count: number }[];
  timeline: { bucket: string; count: number; avg_rating: number }[];
  categories: { exhibit_id: number | null; exhibit_title: string; review_count: number; avg_rating: number }[];
  sentiment: { average_score: number; positive: number; neutral: number; negative: number; sample_size: number };
  response_breakdown: { with_comment: number; rating_only: number };
  fields?: { core: string[]; derived: string[] };
}

const POSITIVE_LEXICON = ['good', 'great', 'excellent', 'amazing', 'love', 'like', 'helpful', 'enjoy', 'wonderful', 'awesome', 'fantastic', 'pleasant', 'satisfied'];
const NEGATIVE_LEXICON = ['bad', 'poor', 'terrible', 'awful', 'hate', 'dislike', 'disappointed', 'boring', 'waste', 'slow', 'rude', 'confusing', 'crowded', 'dirty', 'noisy'];

export const computeSentimentScore = (text?: string | null): number => {
  if (!text) return 0;
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (!tokens.length) return 0;

  let score = 0;
  tokens.forEach((token) => {
    if (POSITIVE_LEXICON.includes(token)) score += 1;
    if (NEGATIVE_LEXICON.includes(token)) score -= 1;
  });

  return score / tokens.length;
};

export const sentimentLabel = (score: number): 'positive' | 'neutral' | 'negative' => {
  if (score > 0.05) return 'positive';
  if (score < -0.05) return 'negative';
  return 'neutral';
};

export const normalizeReview = (raw: any): NormalizedReview => {
  const sentiment_score = computeSentimentScore(raw.comment || raw.description || '');
  const isHidden = raw.is_hidden ?? raw.isHidden ?? false;
  const hasComment = !!(raw.comment || raw.description);
  const response_status: 'commented' | 'rating_only' | 'hidden' = isHidden
    ? 'hidden'
    : hasComment
      ? 'commented'
      : 'rating_only';

  return {
    feedback_id: Number(raw.feedback_id ?? raw.feedbackId ?? 0),
    rating: Number(raw.rating ?? 0),
    comment: raw.comment ?? raw.description ?? null,
    created_at: raw.created_at || raw.createdAt || '',
    updated_at: raw.updated_at || raw.updatedAt || null,
    is_hidden: isHidden,
    user_id: raw.user_id ? Number(raw.user_id) : raw.user?.userId ? Number(raw.user.userId) : null,
    exhibit_id: raw.exhibit_id ? Number(raw.exhibit_id) : raw.exhibit?.exhibitId ? Number(raw.exhibit.exhibitId) : null,
    username: raw.username || raw.user?.username || '',
    exhibitName: raw.exhibit?.title || raw.exhibit_title || raw.exhibitName || '',
    description: raw.comment || raw.description || null,
    status: isHidden ? 'hidden' : 'shown',
    user: raw.user || null,
    exhibit: raw.exhibit || null,
    exhibition: raw.exhibition || null,
    has_comment: hasComment,
    text_length: (raw.comment || raw.description || '').length,
    sentiment_score,
    sentiment_label: sentimentLabel(sentiment_score),
    response_status
  };
};

export const toCsv = (analytics: ReviewAnalyticsPayload): string => {
  const lines: string[] = [];
  lines.push('metric,value');
  lines.push(`total_reviews,${analytics.summary.total_reviews}`);
  lines.push(`average_rating,${analytics.summary.average_rating.toFixed(2)}`);
  lines.push(`hidden_count,${analytics.summary.hidden_count}`);
  lines.push(`shown_count,${analytics.summary.shown_count}`);
  lines.push(`commented_count,${analytics.summary.commented_count}`);
  lines.push(`response_rate,${(analytics.summary.response_rate * 100).toFixed(2)}%`);

  lines.push('');
  lines.push('rating_distribution_rating,rating_distribution_count');
  analytics.rating_distribution.forEach((r) => {
    lines.push(`${r.rating},${r.count}`);
  });

  lines.push('');
  lines.push('timeline_bucket,timeline_count,timeline_avg_rating');
  analytics.timeline.forEach((t) => {
    lines.push(`${t.bucket},${t.count},${t.avg_rating}`);
  });

  lines.push('');
  lines.push('category_title,category_count,category_avg_rating');
  analytics.categories.forEach((c) => {
    lines.push(`${c.exhibit_title},${c.review_count},${c.avg_rating}`);
  });

  lines.push('');
  lines.push('sentiment_average_score,sentiment_positive,sentiment_neutral,sentiment_negative');
  lines.push(`${analytics.sentiment.average_score},${analytics.sentiment.positive},${analytics.sentiment.neutral},${analytics.sentiment.negative}`);

  return lines.join('\n');
};

export const exportAnalyticsCsv = (analytics: ReviewAnalyticsPayload) => {
  const csv = toCsv(analytics);
  saveAs(csv, 'review-analytics.csv', 'text/csv');
};

export const exportAnalyticsJson = (analytics: ReviewAnalyticsPayload) => {
  const json = JSON.stringify(analytics, null, 2);
  saveAs(json, 'review-analytics.json', 'application/json');
};
