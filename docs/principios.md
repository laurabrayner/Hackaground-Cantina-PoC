# Princípios de projeto no código

Hackathon Relâmpago #1 de FDS 2026.2 (cap. 5, *Engenharia de Software Moderna*, Marco Tulio Valente).

## Por que esse app

Conversamos com a atendente da cantina (Imperial Padaria) durante o expediente:

- **Tapioca** é a campeã de vendas, seguida da **coxinha**.
- Ela anota os pedidos **no papel** e trabalha em dupla.
- Alguns estudantes já pedem antes ("quero uma coxinha para as X horas") e pagam. Assim **não pegam fila**.
- Ela pediu: *"teria como comunicar com o aluno quando o pedido dele estivesse pronto"*.
- Ela pede ao fornecedor **pelo WhatsApp** todos os dias, em duas entregas (manhã e 16h30).

Restrição da equipe: **a cantina não pode ganhar trabalho novo.** Tudo o que dá para automatizar é automático.

## Três acessos

| Acesso | Quem | O que faz |
|---|---|---|
| **CESAR** | Gestão do campus | Vê todas as cantinas (cardápio, fila, entregas, nota média) e **cria cantinas novas**, já com a conta de acesso de cada uma. |
| **Cantina** | Cada cantina tem a sua conta | **Pedidos** (fila automática, um toque em "Pronto"), **Resumo** (dia, semana e mês), **Estoque** (avisos, venda no balcão, perda, mercadoria que chegou, pedido ao fornecedor e histórico), **Cardápio**, **Novo produto** (com foto) e **Configurações** (cor principal e duas secundárias do cardápio virtual). |
| **Estudante** | Qualquer pessoa com e-mail `@cesar.school` | Escolhe a cantina, agenda o horário, recebe o aviso de pronto, cancela ou pede de novo e **avalia cada item** depois de retirar. |

## Arquitetura

Camadas, e a camada de aplicação organizada por acesso:

```
src/
├── dominio/        regras puras: Cantina, Usuario, Produto + políticas, Pedido (+ avaliação), Movimentacao, resumo por período
├── aplicacao/
│   ├── portas.ts   interfaces de repositório, sessão, notificador, leitor de avisos, relógio
│   ├── autorizacao.ts  quem pode o quê (exigirPerfil, cantinaDe)
│   ├── acesso/     Autenticacao, CadastrarEstudante
│   ├── cesar/      CadastrarCantina, VisaoGeralDasCantinas
│   ├── cantina/    PainelDaCantina, EstoqueDaCantina, ReporEstoque, GerenciarCardapio, CadastrarProduto, ConfigurarCantina
│   └── estudante/  ConsultarCantinas, AgendarCompra, PedidosDoEstudante
├── infra/          armazenamento do navegador, memória (testes), relógio, dados de demonstração
├── ui/             uma tela por acesso + login; o HTML de cada aba da cantina fica em ui/cantina/
└── main.ts         raiz de composição: único lugar que conhece as classes concretas
```

## Onde estão os princípios do capítulo 5

| Princípio | Onde | Por que melhora o projeto |
|---|---|---|
| **Composição em vez de herança** | [`Produto`](../src/dominio/produto/Produto.ts) **tem uma** [`PoliticaDeDisponibilidade`](../src/dominio/produto/PoliticaDeDisponibilidade.ts) | "Perecível" e "não perecível" não são subclasses de Produto, e sim comportamentos plugados ([`PreparoNaHora`](../src/dominio/produto/PreparoNaHora.ts), [`ControleDeEstoque`](../src/dominio/produto/ControleDeEstoque.ts)). Um jeito novo de vender é uma política nova. |
| **Substituição de Liskov** | As duas políticas cumprem o mesmo contrato, testado em [`produto.test.ts`](../tests/produto.test.ts) | Nenhuma lança "não suportado". `PreparoNaHora.liberar()` é um no-op legítimo. |
| **Segregação de Interfaces** | `Reabastecivel` × `PoliticaDeDisponibilidade`; `Notificador` × `LeitorDeAvisos` em [`portas.ts`](../src/aplicacao/portas.ts); `RegistroDeVendas = Pick<EstoqueDaCantina, 'registrarVendaDoApp'>`; [`Tela`](../src/ui/Tela.ts) dividida em `ReageACliques`, `ReageAFormularios`, `ReageADigitacao` e `ReageAArquivos` | Quem é feito na hora não implementa `reabastecer()`. Quem só avisa não precisa ler avisos. O painel e o estudante dependem só do método que registra a venda. Cada tela implementa só a interação que tem: a do CESAR só tem formulário e não carrega métodos vazios. |
| **Inversão de Dependências** | [`portas.ts`](../src/aplicacao/portas.ts) + [`main.ts`](../src/main.ts) | Casos de uso dependem de `RepositorioDePedidos`, `Sessao`, `Relogio`… nunca do navegador ou de `Date`. **Prova:** passamos de "tudo em memória" para "tudo no `localStorage`" mudando só `main.ts`. Os testes usam as versões em memória e um `RelogioParado`. |
| **Aberto/Fechado** | [`NotificadorComposto`](../src/infra/notificadores.ts), [`restaurarPolitica`](../src/dominio/produto/restaurarPolitica.ts) | Um canal de aviso novo (som, WhatsApp, e-mail) é uma classe nova + uma linha em `main.ts`. Uma política de venda nova é uma classe com `paraDados`/`deDados` + uma linha no registro de políticas, sem `if` ou `switch`; o compilador acusa se a linha faltar. Cantina nova é **dado**, não código: o CESAR cria pela tela. |
| **Ocultamento de informação** | [`Pedido`](../src/dominio/pedido/Pedido.ts), [`Usuario`](../src/dominio/usuario/Usuario.ts), [`Cantina`](../src/dominio/cantina/Cantina.ts) | O status do pedido e as notas são privados e só mudam por métodos que validam a regra. A senha nunca sai de `Usuario` (só `confereSenha()`). As cores da cantina só mudam por `mudarCores()`. Até para restaurar do armazenamento quem mexe no estado é a própria classe (`deDados()`). |
| **Responsabilidade Única / Coesão** | Um caso de uso por arquivo, agrupados por acesso; uma aba por módulo em [`ui/cantina/`](../src/ui/cantina) | `EstoqueDaCantina` cuida do estoque e do histórico de onde sai o Resumo, `ReporEstoque` só do pedido ao fornecedor, `PainelDaCantina` só da fila. A `TelaCantina` só guarda o estado e traduz cliques em casos de uso; o HTML de cada aba (Pedidos, Resumo, Estoque, Cardápio, Novo produto, Configurações) fica no seu módulo. |
| **Demeter** | `Produto.nivelDeEstoque()`, `Produto.reposicaoNecessaria()`, `Produto.darBaixa()` | Ninguém escreve `produto.politica.algo()`: quem usa conversa só com `Produto`. |
| **Integridade conceitual** | Vocabulário único em código, telas e diagrama | Os três acessos têm os mesmos nomes em todo lugar (`cesar`, `cantina`, `estudante`), e as classes usam as palavras da cantina (pedido, cardápio, retirada, entrada, saída). |

## Previsão do pico (Entrega 2)

Na aba **Pedidos**, a cantina vê quanto de cada item preparar para o **próximo intervalo**, somando
os pedidos já agendados, e a hora de começar para ter tudo pronto quando o intervalo abrir.

| Peça | Onde | Princípio |
|---|---|---|
| Interface `PrevisaoDeDemanda` | [`PrevisaoDeDemanda.ts`](../src/aplicacao/cantina/PrevisaoDeDemanda.ts) | **Inversão de Dependências:** a `TelaCantina` recebe só a interface e não sabe como a previsão é calculada. |
| Implementação `PrevisaoPelosAgendados` | [`PrevisaoPelosAgendados.ts`](../src/aplicacao/cantina/PrevisaoPelosAgendados.ts) | **Aberto/Fechado:** outro jeito de prever (por exemplo, somar a média do balcão dos dias anteriores) é uma classe nova trocada em `main.ts`, sem tocar nas telas. |
| `IntervaloDeAula` e `GradeDeIntervalos` | [`dominio/intervalo/`](../src/dominio/intervalo) | **Ocultamento de informação e coesão:** só o intervalo sabe se um horário cai dentro dele; a grade do campus é dado, em [`intervalosDoCesar.ts`](../src/infra/intervalosDoCesar.ts). |
| Cartão na tela | [`htmlPrevisao.ts`](../src/ui/cantina/htmlPrevisao.ts) | **Responsabilidade Única:** o HTML fica no seu módulo, como as outras abas. |

Testes em [`previsaoDoPico.test.ts`](../tests/previsaoDoPico.test.ts), com o mesmo `RelogioParado` dos outros testes.

## Módulos profundos

Seguindo o artigo [Módulos profundos](https://engsoftmoderna.info/artigos/deep-modules.html): interface
pequena escondendo uma implementação grande, como o sistema de arquivos do Unix.

| Onde na tela | Interface | O que fica escondido |
|---|---|---|
| Cantina → aba **Resumo** | [`resumirPeriodo(movimentos, periodo, agora)`](../src/dominio/estoque/resumirPeriodo.ts) | Início do período no calendário, filtragem, agrupamento por hora ou dia, totais e ranking |
| Estudante → carrinho, **Agendar** | [`agendarCompra.executar(solicitacao)`](../src/aplicacao/estudante/AgendarCompra.ts) | Perfil, uma cantina por pedido, estoque, tempo de preparo e reserva "tudo ou nada" |
| Cantina → aba **Estoque**, **Registrar** | [`estoque.registrar(quem, dados)`](../src/aplicacao/cantina/EstoqueDaCantina.ts) | Dono do produto, valor da venda, baixa ou reposição e registro no histórico |
| Estudante → **escolha da cantina** | [`consultar.vitrine()`](../src/aplicacao/estudante/ConsultarCantinas.ts) | Itens de hoje e nota média de cada cantina |
| Cantina → **Novo produto**, foto | [`reduzirImagem(arquivo)`](../src/ui/imagem.ts) | Leitura do arquivo, redução e compressão da foto |
| Todas → dados | `salvar` / `buscarPorId` / `listar` | JSON, `localStorage` e reconstrução dos objetos |

Os módulos rasos que encontramos foram corrigidos: o `ResumoDaCantina`, que só repassava a chamada,
virou um método do `EstoqueDaCantina`; `ConsultarCantinas.listar()`, que só repassava o repositório,
virou a `vitrine()`; e `precisaRepor()` + `sugestaoDeReposicao()` viraram uma pergunta só,
`reposicaoNecessaria()`. Métodos curtos que ficaram, como `exigirPerfil()` e `primeiroNome`, valem
pelo nome, como o `isEmpty()` do artigo.

**Permissões nos casos de uso, não na tela** ([`autorizacao.ts`](../src/aplicacao/autorizacao.ts)): uma
cantina não vê nem mexe nos pedidos e produtos de outra, um estudante não cancela nem avalia pedido
alheio e só o CESAR cria cantinas. Os testes cobrem cada caso ([`casosDeUso.test.ts`](../tests/casosDeUso.test.ts)).

## Usabilidade (heurísticas de Nielsen)

- **Status visível:** selos *Agendado → Pronto! → Retirado*; aviso na tela do estudante; contadores nas abas; faixa de alerta de estoque em todas as abas da cantina.
- **Linguagem do usuário:** "Feito na hora", "Venda no balcão", "Chegou mercadoria", "Peguei!".
- **Controle e liberdade:** o estudante cancela (o estoque volta) e muda a nota; a cantina desfaz um "Pronto" tocado por engano.
- **Prevenção de erros:** horário já vem no mais cedo possível; "+" desabilitado sem estoque; o texto do cardápio fica claro ou escuro sozinho conforme a cor que a cantina escolher; a foto é reduzida antes de salvar.
- **Reconhecimento em vez de memorização:** o carrinho mostra os itens; cada pedido diz de qual cantina é; o estoque mostra "3 de 12" com barra.
- **Eficiência:** "Pedir de novo"; com uma cantina só, ela já vem escolhida.
- **Estética e minimalismo:** pedidos já avaliados vão para "Pedidos anteriores", recolhido.
- **Mensagens de erro úteis:** *"Não dá tempo de preparar: escolha a partir das 20:12."*, *"Água de coco: só tem 3 no estoque."*
- **Ajuda:** "Como funciona?" curto e recolhível em cada tela.

## Identidade visual

Segue o design system do [cesar.school](https://www.cesar.school): laranja `#FF6002` e preto, fundo
branco, Barlow nos títulos e DM Sans no texto, botões em pílula e cartões bem arredondados. Cada cantina
pinta **só o próprio cardápio** com as cores que escolheu.

O gráfico do Resumo segue um guia de visualização de dados: um eixo só, legenda, dica ao passar o mouse,
tabela alternativa e as duas cores validadas para daltonismo e contraste. Os avisos de estoque usam cores
de status sempre acompanhadas de ícone e texto.

## Limitações da PoC

- Não há backend: tudo fica no `localStorage` do navegador e a sessão vale por aba. As senhas não são criptografadas.
- O histórico do mês passado da Imperial é **fictício**, gerado só para o Resumo não abrir vazio ([`historicoDeExemplo.ts`](../src/infra/historicoDeExemplo.ts)).
- Preços a confirmar: a **tapioca** não está no cardápio impresso (usamos R$ 10,00) e o **Red Bull** estava ilegível na foto (R$ 13,60). Tempos de preparo e quantidades de estoque são estimativas.

## Créditos

- Marcas do CESAR School e da Imperial Padaria, e fotos dos produtos da Imperial: enviadas pela equipe ([`public/`](../public)).
- Ícones: [Lucide](https://lucide.dev) (licença ISC), escolhidos em [icones.js.org](https://icones.js.org) e embutidos em [`icones.ts`](../src/ui/icones.ts).
- Fontes: Barlow e DM Sans (SIL Open Font License), via Fontsource.
- IA utilizada: Claude Code (Anthropic) para gerar código, com revisão e decisões de projeto da equipe.
