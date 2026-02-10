

# Refatoracao Visual: Layout Flutuante com Background Rosa

## Conceito
Transformar o layout do sistema para que a sidebar fique em um plano de fundo com cor `#F5DDEE`, e a area de conteudo (Header + paginas) flutue como um "board" branco sobre esse background, similar a imagem de referencia.

## Estrutura Visual

```text
+------------------------------------------------------------+
|  Background #F5DDEE (tela inteira)                         |
|                                                            |
|  +----------+  +---------------------------------------+  |
|  | Sidebar   |  | Board flutuante (branco)              |  |
|  | (sem borda |  | +-----------------------------------+|  |
|  |  propria,  |  | | Header                            ||  |
|  |  sobre o   |  | +-----------------------------------+|  |
|  |  background|  | | Main Content (scroll interno)     ||  |
|  |  rosa)     |  | |                                   ||  |
|  |            |  | |                                   ||  |
|  +----------+  +---------------------------------------+  |
+------------------------------------------------------------+
```

## Alteracoes por Arquivo

### 1. `src/components/DashboardLayout.tsx`
- Trocar o `bg-gradient-to-br from-background via-background to-muted/10` do container principal por `bg-[#F5DDEE]`
- Envolver o conteudo (Header + main) em um wrapper com `bg-card rounded-2xl shadow-xl m-2 overflow-hidden` para criar o efeito de board flutuante
- A sidebar fica diretamente sobre o background rosa, sem borda ou sombra propria

### 2. `src/components/AppSidebar.tsx`
- Remover `border-r border-primary/10 shadow-md shadow-primary/20` do Sidebar
- Trocar `bg-card` do SidebarContent por `bg-transparent` para que a sidebar fique transparente sobre o fundo rosa
- Ajustar cores dos itens de navegacao: remover `bg-background` dos estados inativos e usar cores que funcionem sobre o fundo rosa (texto escuro, hover com fundo semi-transparente branco)
- O item ativo pode usar fundo branco semi-transparente (`bg-white/70`) para destaque
- Os ActionButtons mantem suas cores mas com ajustes para contraste sobre fundo rosa
- O bloco de creditos mantem o gradiente pois ja tem cores proprias
- No mobile (Sheet), manter `bg-[#F5DDEE]` como fundo do Sheet

### 3. `src/components/Header.tsx`
- Remover `shadow-md shadow-primary/20` e `border-b border-primary/10`
- Trocar `bg-card/95 backdrop-blur-md` por `bg-transparent` pois o header ja esta dentro do board branco flutuante
- Manter uma borda inferior sutil (`border-b border-border/10`) para separar do conteudo

### 4. `src/components/system/SystemLayout.tsx`
- Mesma logica do DashboardLayout: background rosa + board flutuante

### 5. `src/components/system/SystemSidebar.tsx`
- Mesma logica do AppSidebar: sidebar transparente sobre fundo rosa

### 6. `src/index.css`
- Adicionar suporte para dark mode: no dark mode, usar uma versao mais escura do rosa (ex: `#2D1F28`) como background em vez de `#F5DDEE`
- Ajustar a variavel `--sidebar` se necessario

## Detalhes Tecnicos

### Sidebar transparente
Os nav items precisam de ajustes nas cores para funcionar sobre fundo rosa:
- Estado inativo: `text-foreground/70 hover:bg-white/40`
- Estado ativo: `bg-white/70 text-primary shadow-sm`
- Disabled: manter `opacity-50` com `bg-white/20`

### Board flutuante
O wrapper do conteudo usa:
```
className="flex flex-1 flex-col min-w-0 bg-card rounded-l-2xl shadow-xl my-2 mr-2 overflow-hidden"
```
- `rounded-l-2xl` pois o lado esquerdo encosta na sidebar
- `my-2 mr-2` para criar gap visual entre o board e as bordas da tela
- `overflow-hidden` para conter o scroll interno

### Dark mode
No dark mode, o background rosa muda para uma tonalidade escura complementar, e o board flutuante usa `bg-card` que ja e escuro.

### Mobile
No mobile, o layout nao precisa do efeito flutuante (tela muito pequena). O background rosa aparece, a sidebar e um Sheet com fundo rosa, e o conteudo ocupa toda a area.

