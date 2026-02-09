# 📂 DOC em dia - Gestão Inteligente de Documentos

![Status](https://img.shields.io/badge/Status-Concluído-success)
![Platform](https://img.shields.io/badge/Plataforma-Web%20%7C%20Android-blue)
![License](https://img.shields.io/badge/License-MIT-green)

> Uma solução Cross-Platform para monitoramento de vencimentos legais, garantindo conformidade (compliance) e evitando multas operacionais.

---

## 🎯 Sobre o Projeto

O **DOC em dia** é um sistema de gestão desenvolvido para solucionar um problema real: a perda de prazos de documentos regulatórios (Alvarás, Licenças Sanitárias, Certificados Digitais). 

O sistema centraliza as informações, calcula automaticamente os prazos e notifica os gestores proativamente através de múltiplos canais (App Mobile, E-mail e Relatórios Excel).

### 📱 Funcionalidades Principais

* **Dashboard Visual:** Indicadores de status por cores (🟢 Em dia, 🟡 Alerta 30 dias, 🔴 Vencido).
* **Automação Serverless:** Script autônomo rodando via **GitHub Actions** que verifica o banco de dados diariamente às 08:00 e envia relatórios por e-mail.
* **App Android Nativo:**
    * Login persistente (Session Management).
    * **Notificações Locais:** O app alerta o usuário sobre vencimentos mesmo fechado.
    * Integração com Sistema de Arquivos para geração e abertura de planilhas Excel direto no celular.
* **Gestão Completa:** CRUD de documentos com categorização e campos de observação.

---

## 🚀 Tecnologias Utilizadas

O projeto foi construído utilizando uma arquitetura moderna, focada em escalabilidade e baixo custo de manutenção.

### Front-end & Mobile
* **React.js (Vite):** Para construção da interface reativa e veloz.
* **Capacitor:** Bridge para converter a aplicação Web em um App Android Nativo (`.apk`).
* **Plugins Nativos:** * `@capacitor/local-notifications` (Alertas Push Locais).
    * `@capacitor/filesystem` (Gerenciamento de arquivos internos).
    * `@capawesome-team/capacitor-file-opener` (Abertura de anexos/Excel).

### Back-end & Database (BaaS)
* **Supabase:**
    * **PostgreSQL:** Banco de dados relacional robusto.
    * **Auth:** Gerenciamento de usuários e sessões seguras.
    * **RLS (Row Level Security):** Políticas de segurança onde cada usuário acessa apenas seus próprios dados.

### Automação & DevOps
* **GitHub Actions (CI/CD):** Cron jobs para execução de scripts de verificação diária.
* **Node.js:** Script de backend para lógica de varredura de datas.
* **EmailJS:** Serviço de disparo de e-mails transacionais sem necessidade de servidor SMTP dedicado.

---

## 🛠️ Arquitetura da Solução

```mermaid
graph TD
    User[Usuário / Gestor] -->|Acessa| App[App Android / Web]
    App -->|Leitura/Escrita| DB[(Supabase PostgreSQL)]
    
    subgraph "Automação (GitHub Actions)"
        Cron[Cron Job Diário 08:00] -->|Executa| NodeScript[Script de Verificação]
        NodeScript -->|Consulta Vencimentos| DB
        NodeScript -->|Envia Relatório| Email[EmailJS API]
    end
    
    Email -->|Notifica| User
    App -->|Notificação Local| User
