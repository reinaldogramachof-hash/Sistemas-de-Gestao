# Catálogo Comercial Local Oficial

## 1. Papel Funcional e Escopo
O **Catálogo Comercial Local Oficial** (`api_data/products_catalog.json`) estabelece a **fonte da verdade canônica** para a prateleira de produtos, planos, modelos comerciais, canais autorizados e módulos dos 4 sistemas de gestão da plataforma:
1. **Gestão Barbearia** (`gestao-barbearia`)
2. **Gestão Beleza** (`gestao-beleza`)
3. **Gestão Assistência** (`gestao-assistencia`)
4. **Gestão Gastro** (`gestao-gastro`)

A partir da **Fase C.5.2 / C.5.2.1**, o catálogo local passou a governar o backend em PHP via `catalog_loader.php`.
A partir da **Fase C.5.3**, o Painel Admin passou a consumir o Catálogo Comercial Local Oficial através do endpoint seguro `api_catalog.php`.
A partir da **Fase C.5.4 / C.5.4.1**, o Painel Admin tornou-se operacional para criar, editar, ativar/inativar sistemas e salvar diretamente em `products_catalog.json` com backup automático antes de cada gravação, preservando a chave `base_price` e sanitizando canais e modelos por allowlist.

---

## 2. Hierarquia e Ordem de Fallback Visual / Catálogo (Fase C.5.3)
1. **`Supabase Live`** (`api_provisioning.php` -> `action: systems_catalog`): Fonte remota dinâmica em tempo real no Supabase Cloud. Sinalizado com o selo ⚡ `Supabase Live`.
2. **`Catálogo Local Oficial`** (`api_catalog.php` -> `products_catalog.json`): Camada intermediária confiável, offline e versionada no repositório. Sinalizado com o selo 📦 `Catálogo Local Oficial`.
3. **`Fallback JS`** (`SAAS_CATALOG_FALLBACK`): Constante estática no JS mantida como última rede de proteção. Sinalizado com o selo ⚠️ `Fallback JS`.

| Dimensão | Catálogo Local JSON (`products_catalog.json`) | Supabase Cloud (`systems`, `plans`, `plan_modules`) |
| :--- | :--- | :--- |
| **Escopo** | Canônico local (Offline fallback + Fonte primária da aplicação) | Remoto dinâmico em tempo real |
| **Governança** | Versionado no repositório, imune a quedas de rede | Gerenciado via banco PostgreSQL/Supabase |
| **Modelos Cobertos** | SaaS + Vitalícios (ML, Direto, Pro) + Trial + Projeto com Marca | Atualmente focado na camada SaaS / Tenants |
| **Disponibilidade** | 100% Garantida (Fallback offline imediato) | Requer conectividade e credenciais Supabase válidas |

---

## 3. Matriz Canônica de Preços SaaS por Sistema (Fase B.1/B.1.1)

| Sistema | Slug | Plano Essencial (Mensal) | Plano Premium (Mensal) | Modelo de Cobrança |
| :--- | :--- | :--- | :--- | :--- |
| **Gestão Barbearia** | `gestao-barbearia` | R$ 59,90 | R$ 99,00 | Recorrente Mensal |
| **Gestão Beleza** | `gestao-beleza` | R$ 59,90 | R$ 99,00 | Recorrente Mensal |
| **Gestão Assistência** | `gestao-assistencia` | R$ 97,90 | R$ 149,90 | Recorrente Mensal |
| **Gestão Gastro** | `gestao-gastro` | R$ 89,00 | R$ 189,00 | Recorrente Mensal |

---

## 4. Estrutura Canônica de Produtos e Modelos Comerciais

### 4.1 Sistemas com Paridade Total (Barbearia, Beleza, Assistência)
Estes três sistemas compartilham paridade de distribuição e aceitam todos os modelos e canais:
- **Canais Permissíveis**: `mercadolivre`, `direct`, `landing_page`, `admin_saas`.
- **Modelos Comerciais**:
  - `ml_lifetime` (Produto ML Vitalício - R$ 97,00)
  - `direct_lifetime` (Site Vitalício - R$ 299,90)
  - `pro_lifetime` (Pro Vitalício - R$ 599,90)
  - `trial` (Trial Gratuito de 7 dias)
  - `online_essential` (SaaS Essencial - Conforme tabela por sistema)
  - `online_premium` (SaaS Premium - Conforme tabela por sistema)
  - `project_custom_brand` (Projeto com Marca / Customização)

### 4.2 Decisão Arquitetural: Gestão Gastro
- **SaaS Recomendado (`saas_recommended: true`)**: O Gestão Gastro foi arquitetado especificamente para o ecossistema SaaS da nuvem Supabase (Comanda/PDV, Mesas/Garçom Mobile, KDS, Delivery).
- **Venda ML Padrão Proibida (`standard_ml_allowed: false`)**: Não é vendido como produto vitalício padronizado de prateleira via Mercado Livre. Os canais `mercadolivre` e modelos `ml_lifetime` são removidos da sua prateleira padrão.
- **Atendimento Offline / Standalone**: Permitido apenas sob demanda presencial e com infraestrutura dedicada (`offline_standalone_fallback`), exigindo sinalização e acompanhamento operacional específico.

---

## 5. Governança e CRUD Operacional (Fases C.5.4 e C.5.4.1)
- **Ações no `api_catalog.php` protegidas por `ADMIN_SECRET`**:
  - `save_system`: Cria um novo sistema ou atualiza um sistema existente no JSON.
  - `toggle_status`: Altera o status comercial entre `active` e `inactive` (sem exclusão física).
- **Correções de Persistência (Fase C.5.4.1)**:
  - **Paridade de chave vitalícia**: Gravação estritamente na chave `base_price` (sem gerar chave legada `price`).
  - **Planos Vitalícios em Novos Sistemas**: Novos sistemas nascem com planos `ml_lifetime`, `direct_lifetime` e `pro_lifetime` totalmente preenchidos.
  - **Edição real de Canais e Modelos**: Permite selecionar canais e modelos no Admin com sanitização server-side via allowlists fixas.
- **Mecanismo de Backup Automático**: Antes de qualquer gravação ou alteração em `api_data/products_catalog.json`, o backend realiza um snapshot do arquivo em `api_data/products_catalog.backup.YYYYMMDD_HHMMSS.json`.
- **Interface no Admin**: O modal no `admin/index.html` exibe alerta operacional ao editar o Gastro, checkboxes para canais e modelos, e emite feedback não-bloqueante ao salvar.

---

## 6. Padronização dos Cards de Prateleira no Admin (Fase C.5.4.3)
A partir da **Fase C.5.4.3**, os cards dos sistemas e planos no módulo **Catálogo Comercial** do Painel Admin foram padronizados em um **modelo visual canônico e replicável** para sistemas atuais e futuros:

1. **Header do Card de Sistema**:
   - Nome do Sistema, Subtítulo/Descrição e Ícone Temático.
   - Badge de Status Comercial (`Ativo` / `Inativo`).
   - Badges de Regras e Destaques: `SaaS Recomendado`, `ML Padrão Permitido` / `ML Padrão Indisponível`, `Offline / Standalone Permitido`.
2. **Metadados do Produto**:
   - Badges de **Canais Permitidos** (`Mercado Livre`, `Venda Direta`, `Landing Page`, `Admin SaaS`).
   - Badges de **Modelos Comerciais** (`ML Vitalício`, `Direto Vitalício`, `Pro Vitalício`, `Trial`, `SaaS Essencial`, `SaaS Premium`, `Marca Própria`).
3. **Organização em Três Grupos Finais de Planos**:
   - **Grupo 1: Recorrentes Online / SaaS**:
     - `Online Essencial` (Barbearia R$ 59,90/mês, Beleza R$ 59,90/mês, Assistência R$ 97,90/mês, Gastro R$ 89,00/mês).
     - `Online Premium` (Barbearia R$ 99,00/mês, Beleza R$ 99,00/mês, Assistência R$ 149,90/mês, Gastro R$ 189,00/mês).
     - Exibe quantidade de dispositivos, usuários e pills/preview de recursos.
   - **Grupo 2: Licenças Vitalícias / Standalone**:
     - Exibe planos vitalícios de venda única (`ml_lifetime`, `direct_lifetime`, `pro_lifetime`) com leitura estrita de `base_price` (`R$ 97,00`, `R$ 299,90`, `R$ 599,90`).
     - Para sistemas que não comercializam vitalícios avulsos (como o Gastro), exibe mensagem discreta de indisponibilidade na prateleira.
   - **Grupo 3: Avaliação Gratuita / Trial**:
     - Exibe dias grátis de teste (ex: 7 dias), limite de dispositivos e usuários.

## 7. Preservação Canônica do JSON Pós-CRUD (Fase C.5.4.4)
Na **Fase C.5.4.4**, o salvamento via `api_catalog.php` foi aprimorado para realizar um **merge seguro** ao editar sistemas:
1. **Preservação de Estruturas Canônicas**: Mantém intactos campos não expostos no formulário da UI (`trial_config`, `project_custom_brand_config`, `offline_standalone_fallback`, etc.).
2. **Tipagem Estrita de Objetos Vazios**: Garante que `gestao-gastro.lifetime_plans` seja serializado estritamente como objeto JSON `{}` e não como array `[]`.
3. **Criação de Novos Sistemas**: Sistemas novos iniciam automaticamente com blocos de configuração padrão para `trial_config` e `project_custom_brand_config`.
