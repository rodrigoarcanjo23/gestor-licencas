# 📑 Gestor de Licenças e Prazos

Sistema web desenvolvido para gerenciamento de documentos corporativos, controle de vencimentos e notificações automáticas. O projeto visa solucionar a perda de prazos de licenças (Alvarás, AVCB, Licenças Ambientais) através de indicadores visuais e relatórios ativos.

## 🚀 Funcionalidades

- **Dashboard Visual:**
  - 🟢 **Verde:** Documentos em dia (> 30 dias).
  - 🟡 **Amarelo:** Alerta de vencimento (próximos 30 dias).
  - 🔴 **Vermelho:** Documentos vencidos.
  
- **Gestão de Arquivos:**
  - Upload de arquivos PDF integrados ao Supabase Storage.
  - Visualização direta do documento sem necessidade de download.

- **Notificações Inteligentes:**
  - **Relatório por E-mail:** Envia um resumo dos documentos críticos via EmailJS.
  - **Relatório via WhatsApp:** Gera um link com mensagem pré-formatada contendo links e datas dos documentos vencidos/próximos.

- **Filtros e Busca:**
  - Busca em tempo real por nome.
  - Filtro por Status (Vencidos, Alerta, OK).
  - Filtro por Categorias (PCMSO, AVCB, etc.).

- **Responsividade:** Layout totalmente adaptado para Mobile e Desktop.

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React.js + Vite
- **Banco de Dados & Auth:** Supabase (PostgreSQL)
- **Armazenamento:** Supabase Storage
- **Envio de Emails:** EmailJS
- **Estilização:** CSS Modules / Inline Styles (Custom Design)
- **Deploy:** Vercel

## ⚙️ Configuração Local

1. **Clone o projeto:**
   ```bash
   git clone [https://github.com/SEU_USUARIO/gestor-licencas.git](https://github.com/SEU_USUARIO/gestor-licencas.git)
   cd gestor-licencas
