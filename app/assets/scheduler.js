'use strict';
// Vendor FSRS-6 with official default short-term learning/relearning steps.
const BioScheduler = (() => {
  const engine = FSRS.fsrs({request_retention:0.9, enable_fuzz:false,
    enable_short_term:true});
  const ratings = Object.freeze({again:1, hard:2, good:3, easy:4, remembered:3});
  const clone = value => JSON.parse(JSON.stringify(value));
  function valid(card) {
    if (!card || typeof card !== 'object' || Array.isArray(card)) return false;
    if (!Number.isFinite(new Date(card.due).getTime()) ||
        !Number.isFinite(new Date(card.last_review).getTime())) return false;
    for (const field of ['stability','difficulty','elapsed_days','scheduled_days','learning_steps','reps','lapses','state']) {
      if (!Number.isFinite(card[field]) || card[field] < 0) return false;
    }
    return card.stability > 0 && card.difficulty >= 1 && card.difficulty <= 10 &&
      [1,2,3].includes(card.state) && ['learning_steps','reps','lapses'].every(k=>Number.isInteger(card[k]));
  }
  function grade(prior, rating, now = Date.now()) {
    const value = typeof rating === 'number' ? rating : ratings[rating];
    if (![1,2,3,4].includes(value) || !Number.isFinite(now)) throw Error('无效的复习评分或时间');
    if (prior?.fsrs && !valid(prior.fsrs)) throw Error('FSRS 记录损坏，请恢复有效备份');
    if (prior?.fsrs && now < new Date(prior.fsrs.last_review).getTime()) throw Error('设备时间早于上次复习时间');
    // Do not invent ratings from legacy level/due fields. Keep legacy metadata;
    // initialize the memory model at the first actual FSRS-era review.
    const card = prior?.fsrs || FSRS.createEmptyCard(new Date(now));
    const result = engine.next(card, new Date(now), value);
    return {record:{...prior, firstAt:prior?.firstAt ?? now, lastAt:now,
      due:result.card.due.getTime(), wrong:value===1,
      level:value===1?0:Math.min((prior?.level||0)+1,5),
      fsrs:clone(result.card), scheduler:'FSRS-6', schedulerVersion:'ts-fsrs@5.4.2',
      ...(prior && !prior.fsrs ? {legacySchedule:{due:prior.due,level:prior.level,lastAt:prior.lastAt}} : {})},
      log:clone(result.log), rating:value};
  }
  function preview(prior, now = Date.now()) {
    return ['again','hard','good','easy'].map(rating=>({rating,due:grade(prior,rating,now).record.due}));
  }
  return Object.freeze({grade,preview,valid,ratings,algorithm:'FSRS-6',version:'5.4.2'});
})();
