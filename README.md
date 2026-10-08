# OrçaGrafica

Gestão para gráficas e comunicação visual: orçamentos (PDF), ordens de serviço, clientes/pedidos, gastos, fluxo de caixa, materiais e o "Meu Assessor" (envelopes do dinheiro recebido).
Next.js 14 + Supabase (Auth, Postgres com RLS, Storage) + Vercel.

## Subir em 4 passos

1. **Supabase**: crie um projeto novo. No SQL Editor, cole `supabase/schema.sql` inteiro e rode (começa zerado, sem dados).
   - Authentication > URL Configuration: coloque a URL do site (Vercel) em *Site URL*.
   - Authentication > Providers > Email: deixe a confirmação de e-mail ligada (recomendado).
2. **Git**: `git init`, confira que `.env*` não aparece em `git status`, e suba para um repositório novo.
3. **Vercel**: importe o repositório e adicione as variáveis (veja `.env.example`):
   - `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Project Settings > API)
   - `SUPABASE_SERVICE_ROLE_KEY` (mesma tela; só servidor) e as variáveis da Asaas (veja **Assinatura** abaixo)
4. Abra o site, **crie a conta**, informe o nome da empresa e complete logo, cores e dados em **Configurações**.

Local: `npm install`, copie `.env.example` para `.env.local`, preencha e rode `npm run dev`.

## Segurança (como funciona)

- **Isolamento por empresa no banco**: toda tabela tem `empresa_id` e RLS (`tenant_isolation`). O app usa a chave **anon + sessão do usuário**, então o banco barra qualquer acesso a dados de outra empresa, mesmo mexendo na URL ou chamando a API pelo navegador.
- **IDs em UUID** (não dá pra adivinhar `/os/1`). O número da OS/orçamento exibido (#0001) é um sequencial por empresa.
- FKs compostas `(id, empresa_id)` impedem ligar registros de empresas diferentes.
- A chave pública (`anon`) não tem permissão em nenhuma tabela. Só usuário logado.
- Logo em bucket **privado**, cada empresa só acessa a própria pasta. Envio valida o conteúdo real do arquivo (PNG/JPG, até 2 MB).
- `middleware.ts` valida a sessão no servidor do Supabase em toda rota (exceto login e cadastro).
- A chave do Supabase aparece no navegador por design (anon key); a proteção é o RLS. **Nunca** use `service_role` com `NEXT_PUBLIC_`.
- `.env*` está no `.gitignore`.

## Personalização por empresa

Em **Configurações**: nome, CNPJ, telefone, e-mail, endereço, **logo** e **duas cores**. Os PDFs (orçamento, OS e relatório) usam logo, dados e cores da empresa.

## Olhinho

O botão de olho no cabeçalho oculta todos os valores em R$ (inclusive eixos e tooltips dos gráficos). A escolha fica salva no navegador.

## Materiais

Tela **Materiais**: nome, unidade (un, m, m², folha, milheiro, kg...), custo, fornecedor e estoque. Serve para gráfica digital e offset.

## Assinatura, teste grátis e Asaas

- Toda conta nova ganha **3 dias de teste grátis**. Acabou o teste sem pagar, o app bloqueia tudo (middleware **e** banco) e mostra só a tela **Assinatura**. Os dados continuam salvos e podem ser lidos; só não dá pra criar/alterar.
- A cobrança é uma **assinatura mensal na Asaas** (o cliente escolhe Pix, boleto ou cartão na página da Asaas). O acesso é liberado por **webhook** quando o pagamento é confirmado, e vale até o vencimento + 1 mês + 3 dias de carência.
- O usuário **não consegue** liberar o próprio acesso: a tabela `assinaturas` só é escrita pelo servidor (service_role).

### Configurar a Asaas
1. Crie a conta em **sandbox.asaas.com** (testes) e gere uma **chave de API** do sandbox.
2. No Netlify, adicione: `ASAAS_API_KEY`, `ASAAS_ENV=sandbox`, `ASAAS_WEBHOOK_TOKEN` (texto longo inventado por você), `PLANO_VALOR` e `SUPABASE_SERVICE_ROLE_KEY`. Faça um novo deploy.
3. No painel da Asaas, em **Integrações > Webhooks**, crie um webhook:
   - URL: `https://SEU-SITE/api/asaas/webhook`
   - Token de autenticação: o mesmo valor de `ASAAS_WEBHOOK_TOKEN`
   - Eventos: `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `PAYMENT_REFUNDED`, `PAYMENT_CHARGEBACK_REQUESTED`, `SUBSCRIPTION_DELETED`, `SUBSCRIPTION_INACTIVATED`
4. Teste no sandbox: crie uma conta, vá em Assinatura, assine, confirme o pagamento no sandbox e veja o acesso liberar.
5. Para vender de verdade: crie a chave de **produção**, troque `ASAAS_API_KEY` e `ASAAS_ENV=producao`, e crie o webhook também na conta de produção.

### Acesso livre (sem cobrança) para uma conta
No SQL Editor do Supabase (troque o e-mail):
```sql
update public.assinaturas set acesso_gratis = true, status = 'gratis'
where empresa_id in (select m.empresa_id from public.membros m join auth.users u on u.id = m.user_id where u.email = 'SEU@EMAIL.COM');
```
