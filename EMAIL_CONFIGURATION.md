# Configuração de Email - Supabase Auth

## Template de Recuperação de Senha Customizado

O template HTML customizado está localizado em: `supabase/email-templates/reset-password.html`

## Como Configurar no Supabase

### 1. Configurar Email SMTP Customizado (Recomendado para Produção)

Para usar o endereço `Equipe Lefil <suporte@notifications.creator.lefil.com.br>`:

1. Acesse o Backend do Lovable Cloud
2. Vá em **Authentication > Email Templates**
3. Configure o SMTP customizado em **Authentication > Settings > SMTP Settings**:
   - **Sender Email**: `suporte@notifications.creator.lefil.com.br`
   - **Sender Name**: `Equipe Lefil`
   - Configure as credenciais SMTP do seu provedor de email

### 2. Customizar o Template de Recuperação de Senha

1. No Backend do Lovable Cloud, vá em **Authentication > Email Templates**
2. Selecione **Reset Password** (Confirm signup)
3. Cole o conteúdo do arquivo `supabase/email-templates/reset-password.html`
4. Salve as alterações

### 3. Upload da Logo

A logo do Creator precisa estar acessível via URL pública:

- A imagem está em: `public/creator-logo-email.png`
- Após o deploy, ela estará disponível em: `https://[seu-dominio]/creator-logo-email.png`
- Atualize a URL no template de email para apontar para sua URL de produção

### Variáveis Disponíveis no Template

O Supabase fornece as seguintes variáveis que podem ser usadas no template:

- `{{ .ConfirmationURL }}` - Link de confirmação/redefinição
- `{{ .Token }}` - Token de verificação (caso queira usar OTP)
- `{{ .TokenHash }}` - Hash do token
- `{{ .SiteURL }}` - URL do seu site
- `{{ .Email }}` - Email do destinatário

## Cores Utilizadas (Identidade Visual Creator)

- **Primary Purple**: `#9b87f5`
- **Background Dark**: `#0A0A0A`
- **Card Background**: `#1A1F2C`
- **Text Light**: `#F1F0FB`
- **Text Muted**: `#D6BCFA`
- **Accent Purple**: `#7E69AB`

## Testando

Após configurar:

1. Vá para a página de login
2. Clique em "Esqueceu a senha?"
3. Digite um email válido
4. Verifique o email recebido com o novo template

## Notas Importantes

- O template é responsivo e funciona bem em dispositivos móveis
- Todas as cores seguem a identidade visual do sistema Creator
- O email está completamente em português
- Inclui avisos de segurança e validade do link
- Design moderno com gradientes e sombras
