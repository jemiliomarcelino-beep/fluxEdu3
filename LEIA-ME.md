# FluxEdu Cloud — autenticação, base de dados e pagamentos

Esta versão liga o front-end a um projecto Supabase e inclui duas Supabase Edge Functions para iniciar e confirmar pagamentos pela EPay. O código está preparado para configuração; não fica activo até criares as contas, colocares as credenciais e publicares as funções.

## 1. Criar o Supabase
1. Cria um projecto em https://supabase.com/.
2. Abre **Project Settings → API** e copia a Project URL e a chave `anon`/`publishable`.
3. Edita `supabase-config.js`. Substitui `https://SEU-PROJETO.supabase.co` e `SUA_CHAVE_ANON_PUBLICA`.
4. No **SQL Editor**, executa todo o ficheiro `supabase/schema.sql`.
5. Em **Authentication → URL Configuration**, define o URL do site publicado e adiciona `https://SEU-UTILIZADOR.github.io/SEU-REPOSITORIO/login.html` aos Redirect URLs (ajusta ao teu endereço real).
6. Em Authentication, configura a confirmação de e-mail e um serviço SMTP apropriado antes de uso real.

## 2. Publicar funções seguras
Instala o Supabase CLI e inicia sessão no terminal:
```bash
npm install -g supabase
supabase login
supabase link --project-ref TEU_PROJECT_REF
supabase functions deploy create-payment
supabase functions deploy epay-webhook --no-verify-jwt
```
Confirma que o projecto está ligado ao Supabase certo antes de executar comandos.

## 3. Configurar EPay em ambiente de teste
1. Cria uma conta de comerciante e gera uma chave `sk_test_...` no painel EPay.
2. Não uses a chave no HTML, em `supabase-config.js`, nem no GitHub.
3. Define os segredos no Supabase:
```bash
supabase secrets set EPAY_SECRET_KEY=sk_test_TUA_CHAVE_DE_TESTE
supabase secrets set APP_PUBLIC_URL=https://SEU-UTILIZADOR.github.io/SEU-REPOSITORIO
```
4. O callback fica em `https://TEU-PROJETO.supabase.co/functions/v1/epay-webhook`.
5. Testa com a chave de teste. Só depois da aprovação do comerciante configura a chave de produção `sk_live_...` nos Secrets do servidor.

Documentação EPay: https://painel.epay.co.mz/docs/api

## 4. Publicar as páginas no GitHub Pages
1. Envia todos os ficheiros da pasta para a raiz do repositório, incluindo `assets/`.
2. Em GitHub → Settings → Pages, escolhe Deploy from a branch, branch `main`, pasta `/ (root)`.
3. Abre o URL publicado e testa cadastro, confirmação de e-mail, login e painel.

## 5. O que já está preparado
- Cadastro e login reais via Supabase Auth.
- Recuperação de palavra-passe por e-mail.
- Criação automática de escola e perfil ao registar-se.
- Tabelas com Row Level Security (RLS) e isolamento por escola.
- Registo e pesquisa de alunos na base de dados online.
- Criação de cobrança de mensalidade com valor consultado no servidor.
- Checkout EPay e webhook HMAC com verificação do estado e valor junto do prestador.
- Histórico de pagamentos e exportação CSV.

## Antes de uso real — leitura obrigatória
- **Não partilhes credenciais secretas** no chat nem no repositório. Usa Supabase Secrets.
- A chave pública Supabase pode estar no front-end; a `service_role` e a chave EPay nunca.
- Configura SMTP, URLs de redirecionamento, domínio HTTPS, cópias de segurança, monitorização e procedimentos de suporte.
- Confirma com EPay a conta, os meios de pagamento, as comissões, o processo de verificação e as condições de produção.
- A versão actual cria um perfil administrativo para cada novo cadastro. Para produção, convém impedir auto-cadastro público e criar escolas/administradores através de convite ou aprovação.
- As funções de pagamento devem ser testadas num projecto de staging antes de processar valores reais.
- Regras legais, privacidade de dados de menores, recibos, reconciliação e reembolsos precisam de revisão operacional e jurídica.
- Os pagamentos são cobrados pela EPay; o FluxEdu não guarda dados de cartões nem PINs móveis.
- Para evitar duplicação de cobrança mensal, a tabela tem uma restrição única por aluno/período. Um pagamento pendente existente pode ser reutilizado quando tem checkout; os casos de falha devem ser revistos antes de criar nova cobrança.
