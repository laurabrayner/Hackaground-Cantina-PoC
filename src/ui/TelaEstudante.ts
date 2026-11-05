import type { AgendarCompra, ItemSolicitado } from '../aplicacao/estudante/AgendarCompra';
import type { ConsultarCantinas } from '../aplicacao/estudante/ConsultarCantinas';
import type { PedidosDoEstudante } from '../aplicacao/estudante/PedidosDoEstudante';
import type { LeitorDeAvisos, Relogio } from '../aplicacao/portas';
import type { Cantina } from '../dominio/cantina/Cantina';
import { ErroDeDominio } from '../dominio/ErroDeDominio';
import { Horario } from '../dominio/Horario';
import type { Pedido, StatusPedido } from '../dominio/pedido/Pedido';
import type { ResumoDeAvaliacao } from '../dominio/pedido/resumirAvaliacoes';
import type { Produto } from '../dominio/produto/Produto';
import type { Usuario } from '../dominio/usuario/Usuario';
import { agruparPorCategoria, escapar, formatarPreco, htmlFoto, htmlMensagem, htmlNota } from './formatacao';
import { icone, iconeDaCategoria } from './icones';
import { estiloDoTema, htmlCabecalhoDaCantina, htmlLogo } from './tema';
import type { Mensagem, ReageACliques, ReageADigitacao, ReageAFormularios, Tela } from './Tela';

export interface DependenciasDoEstudante {
  readonly usuario: Usuario;
  readonly avisos: LeitorDeAvisos;
  readonly cantinas: ConsultarCantinas;
  readonly agendarCompra: AgendarCompra;
  readonly pedidos: PedidosDoEstudante;
  readonly relogio: Relogio;
}

const ROTULO_DO_STATUS: Record<StatusPedido, string> = {
  agendado: 'Agendado',
  pronto: 'Pronto!',
  retirado: 'Retirado',
  cancelado: 'Cancelado',
};

const NOTAS = [1, 2, 3, 4, 5];

/** Antecedência sugerida para o horário de retirada quando a tela abre. */
const MINUTOS_DE_ANTECEDENCIA = 15;

/** Acesso estudante: escolhe a cantina, agenda, acompanha, retira e avalia. */
export class TelaEstudante implements Tela, ReageACliques, ReageAFormularios, ReageADigitacao {
  readonly nome = 'estudante';
  private cantinaEscolhida: string | undefined;
  private horario: string;
  /** O carrinho é sempre de uma cantina só (a escolhida). */
  private readonly carrinho = new Map<string, number>();
  private mensagem: Mensagem | null = null;

  constructor(private readonly deps: DependenciasDoEstudante) {
    this.horario = deps.relogio.agora().mais(MINUTOS_DE_ANTECEDENCIA).toString();
  }

  mostrarMensagem(mensagem: Mensagem | null): void {
    this.mensagem = mensagem;
  }

  aoDigitar(campo: string, valor: string): void {
    if (campo === 'horario') this.horario = valor;
  }

  aoClicar(acao: string, elemento: HTMLElement): void {
    const { usuario } = this.deps;
    const produtoId = elemento.dataset.id ?? '';
    const numero = Number(elemento.dataset.numero);
    if (acao === 'escolher-cantina') this.cantinaEscolhida = elemento.dataset.id;
    if (acao === 'trocar-cantina') this.trocarDeCantina();
    if (acao === 'adicionar') this.carrinho.set(produtoId, (this.carrinho.get(produtoId) ?? 0) + 1);
    if (acao === 'remover') this.removerDoCarrinho(produtoId);
    if (acao === 'repetir') this.pedirDeNovo(numero);
    if (acao === 'retirei') {
      this.deps.pedidos.confirmarRetirada(usuario, numero);
      this.mensagem = { tipo: 'sucesso', texto: 'Retirada confirmada. Bom lanche! Depois conta pra gente o que achou.' };
    }
    if (acao === 'cancelar') {
      this.deps.pedidos.cancelar(usuario, numero);
      this.mensagem = { tipo: 'sucesso', texto: `Pedido #${numero} cancelado.` };
    }
    if (acao === 'avaliar') {
      this.deps.pedidos.avaliarItem(usuario, numero, elemento.dataset.produto ?? '', Number(elemento.dataset.nota));
      // Avaliação completa: o pedido vai para o histórico, então confirmamos aqui em cima.
      const pedido = this.meusPedidos().find((p) => p.numero === numero);
      if (pedido?.estaTodoAvaliado()) {
        this.mensagem = { tipo: 'sucesso', texto: `Obrigado! Sua avaliação do pedido #${numero} ajuda os colegas e a cantina.` };
      }
    }
    this.ajustarHorario();
  }

  aoEnviar(): void {
    const cantina = this.cantinaAtual();
    if (!cantina) throw new ErroDeDominio('Escolha uma cantina primeiro.');
    const pedido = this.deps.agendarCompra.executar({
      cliente: this.deps.usuario,
      cantinaId: cantina.id,
      horarioDeRetirada: this.horario,
      itens: this.itensDoCarrinho(),
    });
    this.carrinho.clear();
    this.mensagem = {
      tipo: 'sucesso',
      texto: `Pedido #${pedido.numero} agendado na ${cantina.nome} para ${pedido.horarioDeRetirada}. Avisamos aqui quando estiver pronto.`,
    };
  }

  html(): string {
    const cantina = this.cantinaAtual();
    return `
      <header class="cabecalho-tela">
        <p class="sobretitulo">Olá, ${escapar(this.deps.usuario.primeiroNome)}</p>
        <h2 class="titulo-tela">${cantina ? 'O que vai ser hoje?' : 'Escolha a cantina'}</h2>
      </header>
      <details class="ajuda">
        <summary>Como funciona?</summary>
        <ol>
          <li>Escolha a cantina, o lanche e o horário em que vai buscar.</li>
          <li>A cantina prepara para ficar pronto nesse horário.</li>
          <li>Quando estiver pronto, aparece um aviso aqui. É só buscar no balcão e pagar.</li>
          <li>Depois, dê uma nota para cada item. Ajuda os colegas e a cantina.</li>
        </ol>
      </details>
      ${htmlMensagem(this.mensagem)}
      ${this.htmlAvisos()}
      ${this.htmlMeusPedidos()}
      ${cantina ? this.htmlCardapio(cantina) : this.htmlEscolhaDeCantina()}`;
  }

  /** Com uma cantina só no campus, ela já vem escolhida: um toque a menos. */
  private cantinaAtual(): Cantina | undefined {
    if (this.cantinaEscolhida) return this.deps.cantinas.buscar(this.cantinaEscolhida);
    const todas = this.deps.cantinas.vitrine();
    return todas.length === 1 ? todas[0].cantina : undefined;
  }

  private trocarDeCantina(): void {
    if (this.carrinho.size > 0) {
      this.mensagem = { tipo: 'erro', texto: 'Carrinho esvaziado: cada pedido é de uma cantina só.' };
    }
    this.carrinho.clear();
    this.cantinaEscolhida = undefined;
  }

  private removerDoCarrinho(produtoId: string): void {
    const quantidade = (this.carrinho.get(produtoId) ?? 0) - 1;
    if (quantidade > 0) this.carrinho.set(produtoId, quantidade);
    else this.carrinho.delete(produtoId);
  }

  private itensDoCarrinho(): ItemSolicitado[] {
    return [...this.carrinho].map(([produtoId, quantidade]) => ({ produtoId, quantidade }));
  }

  private meusPedidos(): Pedido[] {
    return this.deps.pedidos.meusPedidos(this.deps.usuario);
  }

  /** Atalho para quem pede sempre a mesma coisa: abre a cantina do pedido e refaz o carrinho. */
  private pedirDeNovo(numero: number): void {
    const pedido = this.meusPedidos().find((p) => p.numero === numero);
    if (!pedido) return;
    this.cantinaEscolhida = pedido.cantinaId;
    const produtos = new Map(this.deps.cantinas.cardapioDoDia(pedido.cantinaId).map((p) => [p.id, p]));
    this.carrinho.clear();
    const faltando: string[] = [];
    for (const item of pedido.itensParaListar()) {
      if (produtos.get(item.produtoId)?.estaDisponivel(item.quantidade)) this.carrinho.set(item.produtoId, item.quantidade);
      else faltando.push(item.nome);
    }
    if (faltando.length) {
      this.mensagem = { tipo: 'erro', texto: `Hoje não tem: ${faltando.join(', ')}. O resto já está no carrinho.` };
    }
  }

  /** Prevenção de erro: o horário nunca fica antes do que dá para preparar. */
  private ajustarHorario(): void {
    const maisCedo = this.deps.agendarCompra.horarioMaisCedo(this.itensDoCarrinho());
    try {
      if (Horario.de(this.horario).ehAntesDe(maisCedo)) this.horario = maisCedo.toString();
    } catch (erro) {
      if (!(erro instanceof ErroDeDominio)) throw erro;
      this.horario = maisCedo.toString();
    }
  }

  private htmlAvisos(): string {
    const avisos = this.deps.avisos.avisosPara(this.deps.usuario.id);
    return this.meusPedidos()
      .filter((pedido) => pedido.estaPronto())
      .map((pedido) => {
        const aviso = avisos.find((a) => a.numeroDoPedido === pedido.numero);
        return `
          <div class="aviso-pronto" role="status">
            ${icone('sino')}
            <p>${escapar(aviso?.mensagem ?? `Pedido #${pedido.numero} pronto!`)}</p>
            <button class="botao botao-primario" data-acao="retirei" data-numero="${pedido.numero}">Peguei!</button>
          </div>`;
      })
      .join('');
  }

  private htmlEscolhaDeCantina(): string {
    const cartoes = this.deps.cantinas.vitrine().map(({ cantina, itensHoje: itens, avaliacao: nota }) => {
      return `
        <button class="cartao-cantina" data-acao="escolher-cantina" data-id="${cantina.id}" style="${estiloDoTema(cantina.cores)}">
          ${htmlLogo(cantina)}
          <span class="cartao-cantina-texto">
            <strong>${escapar(cantina.nome)}</strong>
            <small>${escapar(cantina.local)} · ${itens} ${itens === 1 ? 'item' : 'itens'} hoje</small>
            ${htmlNota(nota)}
          </span>
        </button>`;
    });
    if (cartoes.length === 0) return `<p class="vazio">${icone('loja')}Nenhuma cantina aberta no app ainda.</p>`;
    return `<div class="grade-cantinas">${cartoes.join('')}</div>`;
  }

  /** Separa: o que está acontecendo, o que falta avaliar e o histórico (recolhido). */
  private htmlMeusPedidos(): string {
    const pedidos = this.meusPedidos();
    if (pedidos.length === 0) return '';
    const emAndamento = pedidos.filter((p) => p.estaNaFila());
    const paraAvaliar = pedidos.filter((p) => p.foiRetirado() && !p.estaTodoAvaliado());
    const anteriores = pedidos.filter((p) => !emAndamento.includes(p) && !paraAvaliar.includes(p));
    const nomes = new Map(this.deps.cantinas.vitrine().map(({ cantina }) => [cantina.id, cantina.nome]));
    const linhas = (lista: Pedido[]) => lista.map((pedido) => this.htmlMeuPedido(pedido, nomes.get(pedido.cantinaId) ?? '')).join('');
    return `
      ${emAndamento.length || paraAvaliar.length ? `<h3 class="subtitulo">Meus pedidos</h3>` : ''}
      <ul class="meus-pedidos">${linhas(emAndamento)}${linhas(paraAvaliar)}</ul>
      ${anteriores.length ? `
        <details class="pedidos-anteriores">
          <summary>Pedidos anteriores (${anteriores.length})</summary>
          <ul class="meus-pedidos">${linhas(anteriores)}</ul>
        </details>` : ''}`;
  }

  private htmlMeuPedido(pedido: Pedido, nomeDaCantina: string): string {
    return `
      <li class="meu-pedido status-${pedido.status}">
        <div class="meu-pedido-linha">
          <div>
            <strong>#${pedido.numero} · ${escapar(nomeDaCantina)} · ${pedido.horarioDeRetirada}</strong>
            <small>${pedido.itensParaListar().map((item) => `${item.quantidade}× ${escapar(item.nome)}`).join(', ')}</small>
          </div>
          <span class="selo selo-${pedido.status}">${ROTULO_DO_STATUS[pedido.status]}</span>
          ${this.htmlAcaoDoPedido(pedido)}
        </div>
        ${pedido.foiRetirado() ? this.htmlAvaliacao(pedido) : ''}
      </li>`;
  }

  private htmlAcaoDoPedido(pedido: Pedido): string {
    if (pedido.estaAgendado()) {
      return `<button class="botao-link" data-acao="cancelar" data-numero="${pedido.numero}">Cancelar</button>`;
    }
    if (pedido.estaPronto()) return '';
    return `<button class="botao-link" data-acao="repetir" data-numero="${pedido.numero}">Pedir de novo</button>`;
  }

  /** Uma linha de estrelas por item: cada coisa do pedido recebe a sua nota. */
  private htmlAvaliacao(pedido: Pedido): string {
    const completa = pedido.itensParaListar().every((item) => pedido.notaDoItem(item.produtoId));
    const linhas = pedido.itensParaListar().map((item) => {
      const nota = pedido.notaDoItem(item.produtoId);
      const estrelas = NOTAS.map(
        (n) => `
          <button class="estrela ${nota && n <= nota ? 'estrela-cheia' : ''}" data-acao="avaliar"
            data-numero="${pedido.numero}" data-produto="${escapar(item.produtoId)}" data-nota="${n}"
            aria-label="${n} de 5" aria-pressed="${nota === n}">${icone('estrela')}</button>`,
      );
      return `
        <li class="avaliacao-item">
          <span>${escapar(item.nome)}</span>
          <div class="estrelas" role="group" aria-label="Sua nota para ${escapar(item.nome)}">${estrelas.join('')}</div>
        </li>`;
    });
    return `
      <div class="avaliacao">
        <p class="avaliacao-titulo">${completa ? 'Obrigado pela avaliação! Dá para mudar a nota quando quiser.' : 'Como estava? Avalie cada item:'}</p>
        <ul>${linhas.join('')}</ul>
      </div>`;
  }

  private htmlCardapio(cantina: Cantina): string {
    const notas = this.deps.cantinas.avaliacoesDoCardapio(cantina.id);
    const grupos = agruparPorCategoria(this.deps.cantinas.cardapioDoDia(cantina.id));
    const trocar = this.deps.cantinas.vitrine().length > 1
      ? `<button class="botao botao-trocar" data-acao="trocar-cantina">${icone('voltar')}Trocar</button>`
      : '';
    const secoes = [...grupos].map(
      ([categoria, produtos]) => `
        <h3 class="categoria-tematica">${iconeDaCategoria(categoria)}${escapar(categoria)}</h3>
        <ul class="lista-produtos">${produtos.map((produto) => this.htmlProduto(produto, notas.get(produto.id))).join('')}</ul>`,
    );
    return `
      <section class="cardapio-tematico" style="${estiloDoTema(cantina.cores)}">
        ${htmlCabecalhoDaCantina(cantina, trocar)}
        <div class="corpo-cardapio">
          ${secoes.join('') || `<p class="vazio">${icone('loja')}Cardápio vazio hoje.</p>`}
        </div>
        ${this.htmlCarrinho(cantina)}
      </section>`;
  }

  private htmlProduto(produto: Produto, nota: ResumoDeAvaliacao | undefined): string {
    const noCarrinho = this.carrinho.get(produto.id) ?? 0;
    const cabeMais = produto.estaDisponivel(noCarrinho + 1);
    return `
      <li class="produto ${produto.estaDisponivel() ? '' : 'produto-esgotado'}">
        ${htmlFoto(produto)}
        <div class="produto-info">
          <strong>${escapar(produto.nome)}</strong>
          <small>${escapar(produto.descricaoDisponibilidade())}</small>
          ${htmlNota(nota)}
        </div>
        <span class="preco">${formatarPreco(produto.precoEmCentavos)}</span>
        <div class="contador">
          ${noCarrinho ? `<button class="botao-redondo" data-acao="remover" data-id="${produto.id}" aria-label="Tirar ${escapar(produto.nome)}">−</button><span>${noCarrinho}</span>` : ''}
          <button class="botao-redondo botao-mais" data-acao="adicionar" data-id="${produto.id}" aria-label="Adicionar ${escapar(produto.nome)}" ${cabeMais ? '' : 'disabled'}>+</button>
        </div>
      </li>`;
  }

  private htmlCarrinho(cantina: Cantina): string {
    if (this.carrinho.size === 0) {
      return `<div class="carrinho carrinho-vazio">Escolha seu lanche e agende a retirada para o intervalo.</div>`;
    }
    const produtos = new Map(this.deps.cantinas.cardapioDoDia(cantina.id).map((p) => [p.id, p]));
    const itens = [...this.carrinho].flatMap(([id, quantidade]) => {
      const produto = produtos.get(id);
      return produto ? [{ produto, quantidade }] : [];
    });
    const total = itens.reduce((soma, { produto, quantidade }) => soma + produto.precoEmCentavos * quantidade, 0);
    const maisCedo = this.deps.agendarCompra.horarioMaisCedo(this.itensDoCarrinho()).toString();
    return `
      <form class="carrinho" data-form="agendar">
        <div class="carrinho-resumo">
          <strong>${formatarPreco(total)}</strong>
          <small>${itens.map(({ produto, quantidade }) => `${quantidade}× ${escapar(produto.nome)}`).join(', ')}</small>
        </div>
        <label class="campo-horario">
          <span>Retirar às (pronto a partir das ${maisCedo})</span>
          <input type="time" data-campo="horario" value="${escapar(this.horario)}" min="${maisCedo}" required />
        </label>
        <button class="botao botao-agendar" type="submit">Agendar</button>
      </form>`;
  }
}
