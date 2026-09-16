"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/locale-provider";
import { reviewCopy } from "../lib/copy";
import type { ReviewSource } from "../lib/constants";
import { trackReviewEvent } from "../lib/analytics";
import { continueToGoogle } from "../lib/continue-to-google";
import { RatingSelector } from "./rating-selector";
import s from "./reviews.module.css";

export function GoogleReviewForm({ source }: { source: ReviewSource }) {
  const copy = reviewCopy[useLocale()];
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const continuing = useRef(false);
  const startedWriting = useRef(false);
  const viewed = useRef(false);

  useEffect(() => {
    if (!viewed.current) {
      viewed.current = true;
      trackReviewEvent("review_page_view", { source });
    }
    const restore = () => { continuing.current = false; setLoading(false); };
    window.addEventListener("pageshow", restore);
    return () => window.removeEventListener("pageshow", restore);
  }, [source]);

  async function handleContinue() {
    if (continuing.current) return;
    continuing.current = true;
    setLoading(true);
    trackReviewEvent("review_google_clicked", { rating, source, hasComment: Boolean(comment.trim()) });
    await continueToGoogle(comment);
  }

  return <section aria-labelledby="review-title">
    <header className={s.heading}>
      <h1 id="review-title">{copy.title}</h1>
      <p>{copy.description}</p>
    </header>
    <RatingSelector rating={rating} label={copy.ratingLabel} starLabel={copy.starLabel} onChange={(value) => {
      setRating(value);
      trackReviewEvent("review_rating_selected", { rating: value, source });
    }} />
    <form onSubmit={(event) => { event.preventDefault(); void handleContinue(); }}>
      <label className={s.label} htmlFor="review-comment">{copy.textareaLabel}<span>{copy.optional}</span></label>
      <textarea id="review-comment" className={s.comment} rows={4} value={comment}
        placeholder={copy.textareaPlaceholder} aria-describedby="review-clipboard-hint"
        onChange={(event) => {
          setComment(event.target.value);
          if (!startedWriting.current && event.target.value.length > 0) {
            startedWriting.current = true;
            trackReviewEvent("review_text_started", { source });
          }
        }} />
      <button type="submit" className={s.continue} disabled={loading} aria-busy={loading}>
        <span role="status">{loading ? copy.continuing : copy.continue}</span><span aria-hidden="true">→</span>
      </button>
      <p id="review-clipboard-hint" className={s.hint}>{copy.clipboardHint}</p>
      <p className={s.publication}>{copy.publicationHint}</p>
    </form>
  </section>;
}
