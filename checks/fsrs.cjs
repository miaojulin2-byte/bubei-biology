const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const ctx=vm.createContext({});
for(const p of ['vendor/ts-fsrs-5.4.2.js','scheduler.js'])vm.runInContext(fs.readFileSync('app/assets/'+p,'utf8'),ctx);
const scheduler=vm.runInContext('BioScheduler',ctx),vendor=ctx.FSRS;
const reference=vendor.fsrs({request_retention:0.9,enable_fuzz:false,enable_short_term:true});
const now=Date.UTC(2026,9,26,8);
for(let rating=1;rating<=4;rating++){
 const actual=scheduler.grade(null,rating,now);
 const expected=reference.next(vendor.createEmptyCard(new Date(now)),new Date(now),rating);
 assert.equal(JSON.stringify(actual.record.fsrs),JSON.stringify(expected.card));
 assert.equal(actual.record.due,expected.card.due.getTime());
 assert.equal(scheduler.valid(actual.record.fsrs),true);
 const resumed=JSON.parse(JSON.stringify(actual.record));
 const delayed=now+7*86400000;
 const next=scheduler.grade(resumed,3,delayed);
 const expectedNext=reference.next(expected.card,new Date(delayed),3);
 assert.equal(JSON.stringify(next.record.fsrs),JSON.stringify(expectedNext.card));
 assert.equal(resumed.fsrs.reps,1,'input is not mutated');
 assert.throws(()=>scheduler.grade(resumed,3,now-1),'clock rollback');
}
const legacy={firstAt:now-100000,lastAt:now-1000,due:now+1000,level:4,wrong:false};
const migrated=scheduler.grade(legacy,'good',now).record;
assert.equal(migrated.firstAt,legacy.firstAt);assert.equal(migrated.legacySchedule.due,legacy.due);
assert.equal(migrated.fsrs.reps,1,'do not fabricate legacy ratings');
assert.equal(legacy.fsrs,undefined);assert.equal(legacy.due,now+1000);
assert.throws(()=>scheduler.grade({fsrs:{due:'invalid'}},'good',now));
assert.equal(scheduler.preview(null,now).length,4);
assert.equal(scheduler.grade(null,'again',now).record.due<now+86400000,true,'same-day relearning');
console.log('PASS: all four grades match official FSRS-6, delayed review, JSON restart, legacy migration, clock guard');
