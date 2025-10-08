# Configuração de Email - Supabase Auth

## Template de Recuperação de Senha Customizado

O template HTML customizado está localizado em: `supabase/email-templates/reset-password.html`

## ✅ Configuração Automática via config.toml

O template de recuperação de senha já está configurado automaticamente no arquivo `supabase/config.toml`:

```toml
[auth.email.template.recovery]
subject = "Redefinir sua senha - Creator"
content_path = "./email-templates/reset-password.html"
```

**Isso significa que o template customizado já está ativo!** Não é necessário configurar manualmente no dashboard.

## Como Testar

1. Vá para a página de **Esqueceu a senha?** no seu aplicativo
2. Digite um email válido cadastrado
3. Verifique a caixa de entrada - o email virá com o template customizado em português!

## 📧 Configurar Remetente Customizado (Opcional)

**Por padrão**, os emails são enviados pelo servidor padrão do Supabase.

**Para usar o endereço `Equipe Lefil <suporte@notifications.creator.lefil.com.br>`**, você precisa configurar SMTP customizado:

### Como Configurar SMTP

<lov-actions>
  <lov-open-backend>Abrir Backend do Lovable Cloud</lov-open-backend>
</lov-actions>

1. No Backend do Lovable Cloud, vá em **Authentication > Settings** ou **Users > Settings**
2. Procure por **SMTP Settings** ou **Email Provider**
3. Configure:
   - **Sender Email**: `suporte@notifications.creator.lefil.com.br`
   - **Sender Name**: `Equipe Lefil`
   - **SMTP Host**: Servidor SMTP do seu provedor (ex: Gmail, SendGrid, AWS SES)
   - **SMTP Port**: Porta do servidor (geralmente 587 ou 465)
   - **SMTP Username**: Usuário de autenticação
   - **SMTP Password**: Senha de autenticação

### Provedores SMTP Recomendados

- **Gmail**: Usar App Password ([instruções aqui](https://support.google.com/accounts/answer/185833))
- **SendGrid**: Gratuito até 100 emails/dia
- **AWS SES**: Barato e confiável
- **Mailgun**: Bom para volume médio

### Logo do Email

A logo está em `public/creator-logo-email.png` e já está configurada no template para carregar automaticamente usando `{{ .SiteURL }}/creator-logo-email.png`.

**Após o deploy para produção**, a logo será acessível automaticamente na URL do seu domínio.

## Variáveis Disponíveis no Template

O Supabase fornece as seguintes variáveis que podem ser usadas no template:

- `{{ .ConfirmationURL }}` - Link de confirmação/redefinição
- `{{ .Token }}` - Token de verificação (caso queira usar OTP)
- `{{ .TokenHash }}` - Hash do token
- `{{ .SiteURL }}` - URL do seu site
- `{{ .Email }}` - Email do destinatário

## 🎨 Cores Utilizadas (Identidade Visual Creator)

- **Primary Purple**: `#9b87f5`
- **Background Dark**: `#0A0A0A`
- **Card Background**: `#1A1F2C`
- **Text Light**: `#F1F0FB`
- **Text Muted**: `#D6BCFA`
- **Accent Purple**: `#7E69AB`

## ℹ️ Notas Importantes

- O template é responsivo e funciona bem em dispositivos móveis
- Todas as cores seguem a identidade visual do sistema Creator
- O email está completamente em português
- Inclui avisos de segurança e validade do link
- Design moderno com gradientes e sombras
