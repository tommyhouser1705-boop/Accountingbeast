(function () {
  const app = document.querySelector('#app');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cloud = new CloudClient(window.LEDGER_CLOUD || {});
  let account = null, classes = [], assignments = [], filter = 'all', error = '';
  const teacher = () => account && account.role !== 'student';
  const href = (id, preview = false) => `office.html?lesson=${encodeURIComponent(id)}${preview ? '&preview=1' : ''}`;
  function render() {
    const nav = teacher() ? [['index.html#dash=gradebook','Gradebook'],['lessons.html#library','Lessons'],['index.html#dash=students','Students'],['index.html#dash=classes','Classes']] : [['index.html','Assignments'],['office.html','My business'],['index.html#dash=grades','Grades']];
    const visible = SIM.catalog.filter(l => filter === 'all' || (filter === 'close' ? l.review : !l.review));
    app.innerHTML = `<div class="app"><aside class="app-side"><a class="app-logo" href="index.html">Ledger Lane</a><nav class="app-nav">${nav.map(([h,t])=>`<a href="${h}" class="${t==='Lessons'?'on':''}">${t}</a>`).join('')}</nav><div class="app-who">${esc(account?.email || 'Free sample')}<a href="index.html#signin">${account?'Account home':'Sign in'}</a></div></aside><main class="app-main"><div class="app-head"><div><h1>${teacher()?'Simulation library':account?'Your business periods':'Run a business. Keep its books.'}</h1><p>${teacher()?'Assign an operating month or a period close. Students keep the same company and books throughout the course.':'Work from business correspondence, make operating decisions, and record what actually happened. No quizzes.'}</p></div></div><p class="note">Each period continues the preceding one. Opening month includes incorporation and Chapters 1–2. Quarter closes are integrated accounting work, not separate quiz reviews.${teacher()?' Preview starts a separate practice company; it never changes a student record.':''}</p>${error?`<p role="alert">${esc(error)}</p>`:''}<div class="app-filters">${[['all','All periods'],['month','Operating months'],['close','Period closes']].map(([id,t])=>`<button data-filter="${id}" class="${filter===id?'on':''}">${t}</button>`).join('')}</div><div class="app-scroll"><table class="app-table lib-table"><thead><tr><th>Period</th><th>Simulation</th><th>Accounting work</th><th>Actions</th></tr></thead><tbody>${visible.map(l=>{
      const assigned = assignments.some(a=>a.lessonId===l.id || l.id==='ch2'&&a.lessonId==='ch1');
      const open = teacher() || (account?.role==='student' && assigned) || l.id==='ch2';
      return `<tr><td>${esc(l.n)}<small>${l.id==='ch2'?'Chapters 1–2':l.review?'Integrated close':'Chapter '+l.id.slice(2)}</small></td><td><strong>${esc(l.title)}</strong><small>${l.review?'Extended closing assignment':'Operating assignment'}</small></td><td>${esc(l.topics.join(' · '))}</td><td class="lib-acts">${open?`<a class="app-link" href="${href(l.id,!!teacher())}">${teacher()?'Preview':assigned?'Open':'Try sample'}</a>`:'<span class="lockline">'+(account?'Not assigned':'Class account required')+'</span>'}${teacher()?`<button class="app-btn" data-assign="${l.id}">${assigned?'Update assignment':'Assign'}</button>`:''}</td></tr>`;
    }).join('')}</tbody></table></div><p class="note">Progress and first-attempt accounting scores save with the student account. Business choices are not graded. Public samples and instructor previews stay in this browser.</p></main></div>`;
    app.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;render();});
    app.querySelectorAll('[data-assign]').forEach(b=>b.onclick=()=>assign(b.dataset.assign));
  }
  function assign(id) {
    if (!teacher()) return;
    const l = SIM.findLesson(id), modal = document.createElement('div'); modal.className='modal';
    modal.innerHTML=`<form class="sheet"><h2>Assign ${esc(l.title)}</h2><p>Students continue their existing business. Earlier periods must be completed first; no accounting is completed for them.</p>${classes.length?`<label>Class<select name="classId">${classes.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select></label><label>Due date<input type="date" name="dueDate" required></label><button class="btn" type="submit">Assign period</button>`:'<p>Create a class on your instructor home first.</p>'}<button class="btn alt" type="button" id="cancel">Cancel</button><p role="alert" id="assign-error"></p></form>`;
    document.body.append(modal);modal.querySelector('#cancel').onclick=()=>modal.remove();
    modal.querySelector('form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),button=e.target.querySelector('[type=submit]');button.disabled=true;
      try{await cloud.call('lesson-assign',{classId:f.get('classId'),dueDate:f.get('dueDate'),lessonId:id,title:l.title});const r=await cloud.call('bootstrap');assignments=r.lessons||[];modal.remove();render();}
      catch(e){modal.querySelector('#assign-error').textContent=e.message;button.disabled=false;}
    };
  }
  async function init() {
    if (cloud.configured && cloud.session) { try { const b=await cloud.call('bootstrap');account=b.user;classes=b.classes||[];assignments=b.lessons||[]; } catch(e){error=e.message;} }
    const id=location.hash.startsWith('#lesson=')?decodeURIComponent(location.hash.slice(8)):null;
    if(id&&SIM.findLesson(id)){location.replace(href(SIM.findLesson(id).id,!!teacher()));return;}
    render();
  }
  init();
})();
