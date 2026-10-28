(() => {
  const cfg=window.FLUXEDU_CONFIG||{};
  const configured=cfg.SUPABASE_URL&&cfg.SUPABASE_ANON_KEY&&!cfg.SUPABASE_URL.includes("SEU-PROJETO")&&!cfg.SUPABASE_ANON_KEY.includes("SUA_CHAVE");
  const sb=configured&&window.supabase?window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY):null;
  const $=id=>document.getElementById(id);
  const money=n=>Number(n||0).toLocaleString("pt-MZ",{minimumFractionDigits:2,maximumFractionDigits:2})+" MT";
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  let schoolId=null,students=[],payments=[],toastTimer;
  function toast(t){$("toast").textContent=t;$("toast").classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>$("toast").classList.remove("show"),3500)}
  function notice(t){$("notice").textContent=t;$("notice").classList.remove("hidden")}
  if(!sb){notice("Configuração em falta: preencha SUPABASE_URL e SUPABASE_ANON_KEY em supabase-config.js.");return;}
  async function init(){
    const {data:{session}}=await sb.auth.getSession();
    if(!session){location.replace("login.html");return;}
    $("user-email").textContent=session.user.email||"Utilizador";
    const {data:profile,error}=await sb.from("profiles").select("school_id,full_name,role,schools(name)").eq("id",session.user.id).single();
    if(error||!profile){notice("Não foi possível carregar o perfil. Confirme que executou o SQL de configuração no Supabase.");return;}
    schoolId=profile.school_id;
    $("school-title").textContent=profile.schools?.name||"Painel da instituição";
    await refresh();
  }
  async function refresh(){
    const [s,p]=await Promise.all([
      sb.from("students").select("id,name,guardian_name,monthly_fee,created_at").eq("school_id",schoolId).order("name"),
      sb.from("payments").select("id,student_id,period,amount,status,created_at,students(name)").eq("school_id",schoolId).order("created_at",{ascending:false}).limit(300)
    ]);
    if(s.error||p.error){notice("Erro ao carregar dados. Confirme as políticas de segurança (RLS) e tente novamente.");return;}
    students=s.data||[];payments=p.data||[];render();
  }
  function render(){
    const term=$("search").value.trim().toLocaleLowerCase("pt");
    const visible=students.filter(s=>(s.name+" "+s.guardian_name).toLocaleLowerCase("pt").includes(term));
    $("students").innerHTML=visible.map(s=>{
      const month=new Date().toISOString().slice(0,7);
      const paid=payments.some(p=>p.student_id===s.id&&p.period===month&&p.status==="paid");
      return `<tr><td><strong>${esc(s.name)}</strong></td><td>${esc(s.guardian_name)}</td><td>${money(s.monthly_fee)}</td><td><span class="pill ${paid?"ok":"pending"}">${paid?"Pago":"Pendente"}</span></td><td><div class="action-cell"><input aria-label="Mês de cobrança de ${esc(s.name)}" type="month" value="${month}" data-month="${s.id}"><button class="mini-action" data-charge="${s.id}">Cobrar</button></div></td></tr>`;
    }).join("")||'<tr><td colspan="5" class="empty">Ainda não existem alunos ou a pesquisa não encontrou resultados.</td></tr>';
    $("payments").innerHTML=payments.map(p=>`<tr><td>${esc(p.students?.name||"Aluno")}</td><td>${esc(p.period)}</td><td>${money(p.amount)}</td><td><span class="pill ${p.status==="paid"?"ok":p.status==="failed"?"bad":"pending"}">${esc(p.status==="paid"?"Confirmado":p.status==="failed"?"Falhado":"Pendente")}</span></td><td>${new Date(p.created_at).toLocaleDateString("pt-MZ")}</td></tr>`).join("")||'<tr><td colspan="5" class="empty">Ainda não existem pagamentos.</td></tr>';
    $("student-count").textContent=students.length;
    $("paid-total").textContent=money(payments.filter(p=>p.status==="paid").reduce((a,p)=>a+Number(p.amount),0));
    $("pending-count").textContent=payments.filter(p=>p.status==="pending").length;
  }
  $("student-form").addEventListener("submit",async e=>{
    e.preventDefault();const button=e.submitter;button.disabled=true;
    const row={school_id:schoolId,name:$("student-name").value.trim(),guardian_name:$("guardian-name").value.trim(),monthly_fee:Number($("fee").value)};
    const {error}=await sb.from("students").insert(row);
    button.disabled=false;
    if(error){toast("Não foi possível registar o aluno. Verifique os campos e permissões.");return;}
    e.target.reset();await refresh();toast("Aluno registado na base de dados partilhada.");
  });
  $("students").addEventListener("click",async e=>{
    const b=e.target.closest("[data-charge]");if(!b)return;
    const student=students.find(s=>s.id===b.dataset.charge);if(!student)return;
    const monthInput=document.querySelector(`[data-month="${CSS.escape(student.id)}"]`);
    const period=monthInput?.value;
    if(!period||!student.monthly_fee||student.monthly_fee<=0){toast("Verifique o mês e a mensalidade.");return;}
    if(payments.some(p=>p.student_id===student.id&&p.period===period&&p.status==="paid")){toast("Esta mensalidade já está paga.");return;}
    b.disabled=true;b.textContent="A criar…";
    const {data,error}=await sb.functions.invoke("create-payment",{body:{student_id:student.id,period}});
    b.disabled=false;b.textContent="Cobrar";
    if(error||!data?.payment_url){toast(data?.error||"Não foi possível iniciar o pagamento. Verifique a configuração do servidor.");return;}
    location.href=data.payment_url;
  });
  $("search").addEventListener("input",render);
  $("logout").addEventListener("click",async()=>{await sb.auth.signOut();location.replace("login.html")});
  $("export").addEventListener("click",()=>{
    const rows=[["Aluno","Período","Valor MZN","Estado","Data"],...payments.map(p=>[p.students?.name||"",p.period,p.amount,p.status,p.created_at])];
    const csv="\uFEFF"+rows.map(r=>r.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(";")).join("\r\n");
    const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));const a=document.createElement("a");a.href=url;a.download="fluxedu-pagamentos.csv";a.click();URL.revokeObjectURL(url);
  });
  sb.auth.onAuthStateChange((event,session)=>{if(event==="SIGNED_OUT")location.replace("login.html")});
  init();
})();