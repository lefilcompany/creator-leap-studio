## Diagnóstico

O domínio `pla.creator.lefil.com.br` carrega o HTML corretamente, mas o `<div id="root">` fica vazio. O erro capturado no console de produção é:

```
Cannot read properties of undefined (reading '__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED')
```

Esse erro vem do `react-dom` tentando acessar internals do `react` que ainda não foram inicializados. Ao inspecionar os bundles publicados:

- `assets/react-CmhjfBA0.js` importa de `./charts-C3tFmzZ0.js`
- `assets/react-dom-v4dcKFTQ.js` importa de `./react-CmhjfBA0.js` **e** de `./charts-C3tFmzZ0.js`

Ou seja, a build atualmente em produção foi gerada com uma configuração antiga de `manualChunks` que criou uma dependência circular entre `react`, `react-dom` e `charts`, e por isso o React sobe pela metade e a página fica em branco.

A configuração atual do repositório (`vite.config.ts`) já não tem mais `manualChunks` e o preview de desenvolvimento carrega normalmente. Portanto o código-fonte já está correto — o que está quebrado é o **artefato publicado**, que está desatualizado em relação ao repositório.

## Plano

1. **Republicar o app** (novo deploy da branch atual) para substituir a build quebrada em produção por uma nova build feita a partir do `vite.config.ts` atual (sem `manualChunks`). Isso gera um bundle único de vendor sem a dependência circular.
2. Após a publicação, **validar** `https://pla.creator.lefil.com.br/`:
   - HTTP 200 e `#root` renderizado (não vazio).
   - Sem `PAGEERROR` sobre `__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED` no console.
   - Tela de login aparece normalmente.
3. Se após republicar o erro voltar, aí sim faremos ajuste de código — provavelmente reforçando o `dedupe` de React no `vite.config.ts` e garantindo que não haja `manualChunks` conflitante — mas o mais provável é que a republicação já resolva, porque a config no repositório já está saudável.

## Observação técnica

- Nenhuma mudança de código é necessária no passo 1; o problema é 100% do artefato publicado.
- Se o usuário quiser blindar contra regressões futuras, podemos adicionar um teste simples (Playwright) que carrega a home publicada e falha se o `#root` estiver vazio — dá para incluir depois, mas não é obrigatório para o fix.
