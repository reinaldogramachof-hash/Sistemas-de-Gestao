# Catálogo Comercial Local Oficial

## 1. Papel Funcional e Escopo
O **Catálogo Comercial Local Oficial** (`api_data/products_catalog.json`) estabelece a **fonte da verdade canônica** para a prateleira de produtos, planos, modelos comerciais, canais autorizados e módulos dos 4 sistemas de gestão da plataforma:
1. **Gestão Barbearia** (`gestao-barbearia`)
2. **Gestão Beleza** (`gestao-beleza`)
3. **Gestão Assistência** (`gestao-assistencia`)
4. **Gestão Gastro** (`gestao-gastro`)

A partir da **Fase C.5.2 / C.5.2.1**, o catálogo local passou a governar o backend em PHP via `catalog_loader.php`.
A partir da **Fase C.5.3**, o Painel Admin passou a consumir o Catálogo Comercial Local Oficial através do endpoint seguro `api_catalog.php`.

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
- **Venda ML Padrão Proibida (`standard_ml_allowed: false`)**: Não é vendido como produto vitalício padronizado de prateleira via Mercado Livre.
- **Atendimento Offline / Standalone**: Permitido apenas sob demanda presencial e com infraestrutura dedicada (`offline_standalone_fallback`), exigindo sinalização e acompanhamento operacional específico.

---

## 5. Integrações Realizadas
- **Backend PHP (Fases C.5.2 / C.5.2.1)**: `catalog_loader.php` consumido por `api_licenca_ml.php` em validações contextuais (`generate` e `register_evolution_lead`).
- **Frontend Admin (Fase C.5.3)**: `api_catalog.php` expõe dados públicos do catálogo local sem segredos. O `admin/index.html` tenta carregar o catálogo local caso o Supabase esteja desconectado antes de recorrer ao fallback estático JS.
