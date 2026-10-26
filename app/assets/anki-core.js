'use strict';
// Escaped text and audited local images only; never run community templates.
const AnkiCore = Object.freeze({
  render(card, revealed = false) {
    const escape = value => String(value).replace(/[&<>"']/g, ch => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    }[ch]));
    if (card.kind === 'basic-self-report') {
      const text = value => escape(value).replace(/\n/g, '<br>');
      const images = field => (card.images || []).filter(img => img.field === field && /^media\/[a-f0-9]{64}\.(png|jpe?g)$/.test(img.src))
        .map(img => `<img class="answer-image" src="${img.src}" alt="${field === 0 ? '题目配图' : '答案配图'}">`).join('');
      return `<div class="basic-question">${text(card.parts[0].text)}${images(0)}</div>` +
        (revealed ? `<section class="basic-answer"><small>答案</small><div>${text(card.parts[1].text)}</div>${images(1)}</section>` : '<p class="answer-prompt">先回想，再查看答案</p>');
    }
    return card.parts.map(part => part.hidden
      ? `<span class="cloze-answer">${revealed ? escape(part.text) : '[' + escape(part.hint || '回想答案') + ']'}</span>`
      : escape(part.text)).join('').replace(/\n/g, '<br>');
  },
  createSession(cards, kind = 'learn') {
    return {ids: cards.map(c => c.id), pos: 0, revealed: false, rated: false, kind};
  },
  reveal(session, history, now = Date.now()) {
    if (session.pos >= session.ids.length) return;
    const id = session.ids[session.pos];
    history.exposures ||= {};
    history.exposures[id] ??= now;
    session.revealed = true;
  },
  rate(session, history, rating, now = Date.now()) {
    if (!session.revealed || session.rated || !['again','hard','good','easy','remembered'].includes(rating)) return false;
    const id = session.ids[session.pos];
    if (!id) return false;
    history.attempts ||= [];
    history.records ||= {};
    const prior = history.records[id];
    const scheduled = BioScheduler.grade(prior, rating, now);
    history.attempts.push({id, at: now, rating, fsrsRating:scheduled.rating,
      fsrsLog:scheduled.log, kind: session.kind,
      firstAnswer: !history.attempts.some(a => a.id === id),
      assessment: 'self-report-after-reveal'});
    history.records[id] = scheduled.record;
    session.rated = true;
    return true;
  },
  next(session) {
    if (!session.rated) return false;
    session.pos++;
    session.revealed = false;
    session.rated = false;
    return true;
  }
});
