import type { CadastrarProduto } from '../aplicacao/cantina/CadastrarProduto';
import type { ConfigurarCantina } from '../aplicacao/cantina/ConfigurarCantina';
import type { EstoqueDaCantina, MotivoManual } from '../aplicacao/cantina/EstoqueDaCantina';
import type { GerenciarCardapio } from '../aplicacao/cantina/GerenciarCardapio';
import type { PainelDaCantina } from '../aplicacao/cantina/PainelDaCantina';
import type { PrevisaoDeDemanda } from '../aplicacao/cantina/PrevisaoDeDemanda';
import type { ReporEstoque } from '../aplicacao/cantina/ReporEstoque';
import type { Relogio } from '../aplicacao/portas';
import { CORES_PADRAO, type Cantina } from '../dominio/cantina/Cantina';
import type { Periodo } from '../dominio/estoque/resumirPeriodo';
import type { Usuario } from '../dominio/usuario/Usuario';
import { htmlCardapio } from './cantina/htmlCardapio';
import { htmlConfiguracoes } from './cantina/htmlConfiguracoes';
import { htmlEstoque, htmlFaixaDeAlerta } from './cantina/htmlEstoque';
import { htmlNovoProduto, lerNovoProduto } from './cantina/htmlNovoProduto';
import { htmlPedidos } from './cantina/htmlPedidos';
import { htmlPrevisao } from './cantina/htmlPrevisao';
import { htmlResumo } from './cantina/htmlResumo';
import { escapar, htmlMensagem } from './formatacao';
import { icone, type NomeDoIcone } from './icones';
import { reduzirImagem } from './imagem';
import { htmlLogo } from './tema';
import type { Mensagem, ReageAArquivos, ReageACliques, ReageADigitacao, ReageAFormularios, Tela } from './Tela';

export interface DependenciasDaCantina {
  readonly usuario: Usuario;
  readonly painel: PainelDaCantina;
  readonly cardapio: GerenciarCardapio;
  readonly estoque: EstoqueDaCantina;
  readonly repor: ReporEstoque;
  readonly cadastrar: CadastrarProduto;
  readonly configurar: ConfigurarCantina;
  /** Só a interface: a tela não sabe como a previsão é calculada. */
  readonly previsao: PrevisaoDeDemanda;
  readonly relogio: Relogio;
}

type Aba = 'pedidos' | 'resumo' | 'estoque' | 'cardapio' | 'novo' | 'configuracoes';

const ROTULO_DO_MOTIVO: Record<MotivoManual, string> = {
  compra: 'entrada',
  'venda-balcao': 'venda no balcão',
  perda: 'perda',
};

/**
 * Acesso cantina: guarda o estado (aba, período, rascunho) e traduz cliques em casos de uso.
 * O HTML de cada aba fica no seu módulo em ui/cantina/ (Responsabilidade Única).
 */
export class TelaCantina implements Tela, ReageACliques, ReageAFormularios, ReageADigitacao, ReageAArquivos {
  readonly nome = 'cantina';
  private aba: Aba = 'pedidos';
  private periodo: Periodo = 'dia';
  private mensagem: Mensagem | null = null;
  /** O que já foi digitado no "Novo produto" sobrevive a redesenhos (ex.: ao escolher a foto). */
  private rascunho: Record<string, string> = {};
  private fotoNova: string | undefined;

  constructor(private readonly deps: DependenciasDaCantina) {}

  mostrarMensagem(mensagem: Mensagem | null): void {
    this.mensagem = mensagem;
  }

  aoDigitar(campo: string, valor: string): void {
    this.rascunho[campo] = valor;
  }

  async aoEscolherArquivo(campo: string, arquivo: File): Promise<void> {
    if (campo === 'foto') this.fotoNova = await reduzirImagem(arquivo);
  }

  aoClicar(acao: string, elemento: HTMLElement): void {
    const { usuario } = this.deps;
    const numero = Number(elemento.dataset.numero);
    if (acao === 'aba') this.aba = elemento.dataset.aba as Aba;
    if (acao === 'periodo') this.periodo = elemento.dataset.periodo as Periodo;
    if (acao === 'pronto') this.deps.painel.marcarPronto(usuario, numero);
    if (acao === 'entregue') this.deps.painel.confirmarEntrega(usuario, numero);
    if (acao === 'desfazer') this.deps.painel.desfazerPronto(usuario, numero);
    if (acao === 'alternar') this.deps.cardapio.alternarNoCardapio(usuario, elemento.dataset.id ?? '');
    if (acao === 'remover-foto') this.fotoNova = undefined;
    if (acao === 'cores-padrao') {
      this.deps.configurar.mudarCores(usuario, CORES_PADRAO);
      this.mensagem = { tipo: 'sucesso', texto: 'Cores do CESAR aplicadas ao seu cardápio.' };
    }
  }

  aoEnviar(formulario: HTMLFormElement): void {
    const { usuario } = this.deps;
    const dados = new FormData(formulario);
    if (formulario.dataset.form === 'entrega') {
      this.deps.repor.registrarEntrega(
        usuario,
        [...dados].map(([produtoId, quantidade]) => ({ produtoId, quantidade: Number(quantidade) })),
      );
      this.mensagem = { tipo: 'sucesso', texto: 'Estoque atualizado e entrada registrada no histórico.' };
    }
    if (formulario.dataset.form === 'movimentacao') {
      const motivo = String(dados.get('motivo')) as MotivoManual;
      const registro = this.deps.estoque.registrar(usuario, {
        produtoId: String(dados.get('produtoId')),
        motivo,
        quantidade: Number(dados.get('quantidade')),
      });
      this.mensagem = { tipo: 'sucesso', texto: `Registrado: ${registro.quantidade}× ${registro.produtoNome} (${ROTULO_DO_MOTIVO[motivo]}).` };
    }
    if (formulario.dataset.form === 'novo-produto') {
      const produto = this.deps.cadastrar.executar(usuario, { ...lerNovoProduto(dados), foto: this.fotoNova });
      this.mensagem = { tipo: 'sucesso', texto: `${produto.nome} já está no cardápio.` };
      this.rascunho = {};
      this.fotoNova = undefined;
    }
    if (formulario.dataset.form === 'cores') {
      this.deps.configurar.mudarCores(usuario, {
        principal: String(dados.get('principal')),
        secundaria1: String(dados.get('secundaria1')),
        secundaria2: String(dados.get('secundaria2')),
      });
      this.mensagem = { tipo: 'sucesso', texto: 'Cores salvas. Os estudantes já veem o cardápio com elas.' };
    }
  }

  html(): string {
    const cantina = this.deps.configurar.minhaCantina(this.deps.usuario);
    const alertas = this.deps.estoque.alertas(this.deps.usuario);
    return `
      <header class="cabecalho-tela cabecalho-com-logo">
        ${htmlLogo(cantina)}
        <div>
          <p class="sobretitulo">Painel da cantina</p>
          <h2 class="titulo-tela">${escapar(cantina.nome)}</h2>
        </div>
      </header>
      ${this.htmlAbas(alertas.esgotados.length + alertas.baixos.length)}
      ${this.aba === 'estoque' ? '' : htmlFaixaDeAlerta(alertas)}
      ${htmlMensagem(this.mensagem)}
      ${htmlAjuda()}
      ${this.htmlDaAba(cantina)}`;
  }

  /** Busca os dados da aba aberta nos casos de uso e entrega ao módulo que desenha. */
  private htmlDaAba(cantina: Cantina): string {
    const { usuario } = this.deps;
    switch (this.aba) {
      case 'pedidos': {
        const agora = this.deps.relogio.agora();
        return htmlPrevisao(this.deps.previsao.proximoIntervalo(usuario), agora)
          + htmlPedidos(this.deps.painel.fila(usuario), this.deps.painel.resumoDoQueFazer(usuario), agora);
      }
      case 'resumo':
        return htmlResumo(this.deps.estoque.resumo(usuario, this.periodo), this.periodo);
      case 'estoque':
        return htmlEstoque({
          alertas: this.deps.estoque.alertas(usuario),
          itens: this.deps.estoque.itens(usuario),
          todosOsProdutos: this.deps.cardapio.todosOsProdutos(usuario),
          historico: this.deps.estoque.historico(usuario),
          listaDeCompras: this.deps.repor.listaDeCompras(usuario),
          mensagemParaFornecedor: this.deps.repor.mensagemParaFornecedor(usuario, cantina.nome),
        });
      case 'cardapio':
        return htmlCardapio(this.deps.cardapio.todosOsProdutos(usuario));
      case 'novo':
        return htmlNovoProduto(this.categorias(), this.rascunho, this.fotoNova);
      case 'configuracoes':
        return htmlConfiguracoes(cantina);
    }
  }

  private categorias(): string[] {
    return [...new Set(this.deps.cardapio.todosOsProdutos(this.deps.usuario).map((p) => p.categoria))];
  }

  private htmlAbas(alertasDeEstoque: number): string {
    const aguardando = this.deps.painel.fila(this.deps.usuario).filter((p) => p.status === 'agendado').length;
    const abas: [Aba, string, NomeDoIcone | null, number][] = [
      ['pedidos', 'Pedidos', null, aguardando],
      ['resumo', 'Resumo', 'grafico', 0],
      ['estoque', 'Estoque', 'pacote', alertasDeEstoque],
      ['cardapio', 'Cardápio', null, 0],
      ['novo', 'Novo produto', null, 0],
      ['configuracoes', 'Configurações', 'configuracoes', 0],
    ];
    const botoes = abas.map(
      ([aba, rotulo, nomeDoIcone, contador]) => `
        <button class="aba ${this.aba === aba ? 'aba-ativa' : ''}" data-acao="aba" data-aba="${aba}" aria-pressed="${this.aba === aba}">
          ${nomeDoIcone ? icone(nomeDoIcone) : ''}${rotulo}${contador ? ` <span class="contador-aba ${aba === 'estoque' ? 'contador-alerta' : ''}">${contador}</span>` : ''}
        </button>`,
    );
    return `<nav class="abas">${botoes.join('')}</nav>`;
  }
}

function htmlAjuda(): string {
  return `
    <details class="ajuda">
      <summary>Como funciona?</summary>
      <ul>
        <li><b>Pedidos:</b> chegam sozinhos, na ordem de começar a preparar. Toque em <b>Pronto</b> e o estudante é avisado.</li>
        <li><b>Previsão do pico:</b> quanto de cada item preparar para o próximo intervalo, somando os pedidos agendados.</li>
        <li><b>Resumo:</b> vendas, entradas e saídas de hoje, da semana e do mês.</li>
        <li><b>Estoque:</b> avisa o que acabou ou está acabando. Registre aqui a venda no balcão, a perda e a mercadoria que chegou.</li>
        <li><b>Cardápio:</b> desligue só o que acabou e não volta hoje.</li>
        <li><b>Configurações:</b> escolha as cores do seu cardápio virtual.</li>
      </ul>
    </details>`;
}
