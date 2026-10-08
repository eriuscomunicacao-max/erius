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
