(() => {
  const cfg = window.FLUXEDU_CONFIG || {};
  const ready = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
    !cfg.SUPABASE_URL.includes("SEU-PROJETO") && !cfg.SUPABASE_ANON_KEY.includes("SUA_CHAVE");
  const client = ready && window.supabase ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;
  const msg = document.getElementById("message");
  const show = (text, error=false) => { if(msg){msg.textContent=text;msg.classList.toggle("error",error);} };
  if (!client) { show("Configure primeiro o URL e a chave pública do Supabase em supabase-config.js.", true); }
  const login = document.getElementById("login-form");
  if(login) login.addEventListener("submit", async e=>{
    e.preventDefault(); if(!client)return;
    const button=login.querySelector('button[type="submit"]');button.disabled=true;show("A validar os dados…");
    const {data,error}=await client.auth.signInWithPassword({email:document.getElementById("email").value.trim(),password:document.getElementById("password").value});
    button.disabled=false;
    if(error){show("Não foi possível entrar. Verifique os dados e confirme o e-mail, se necessário.",true);return;}
    if(data.session) location.href="dashboard.html";
  });
  const signup=document.getElementById("signup-form");
  if(signup) signup.addEventListener("submit",async e=>{
    e.preventDefault();if(!client)return;
    const button=signup.querySelector('button[type="submit"]');button.disabled=true;show("A criar a conta…");
    const school=document.getElementById("school").value.trim(),fullName=document.getElementById("fullname").value.trim();
    const {data,error}=await client.auth.signUp({
      email:document.getElementById("email").value.trim(),
      password:document.getElementById("password").value,
      options:{data:{school_name:school,full_name:fullName},emailRedirectTo:location.origin+"/login.html"}
    });
    button.disabled=false;
    if(error){show(error.message || "Não foi possível criar a conta.",true);return;}
    if(data.session){show("Conta criada. A abrir o painel…");location.href="dashboard.html";}
    else show("Conta criada. Verifique o seu e-mail para confirmar a conta antes de entrar.");
  });
  const reset=document.getElementById("reset-password");
  if(reset) reset.addEventListener("click",async()=>{
    if(!client)return;
    const email=document.getElementById("email").value.trim();
    if(!email){show("Introduza primeiro o seu e-mail no campo acima.",true);return;}
    const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+"/login.html"});
    show(error?"Não foi possível enviar o e-mail de recuperação.":"Se existir uma conta para esse e-mail, receberá instruções de recuperação.",!!error);
  });
})();