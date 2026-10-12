/** "Answered since" / "Asked again after covered" badges for an unanswered question. */
export function GapIndicators({ gap }) {
  return (
    <>
      {gap.answeredSince && <span className="badge badge-success" title="The same question was answered after it last failed; new content probably covers it.">Answered since</span>}
      {gap.askedAgainAfterCovered && <span className="badge badge-warning" title="Marked covered, but users still get no answer.">Asked again after covered</span>}
    </>
  );
}
