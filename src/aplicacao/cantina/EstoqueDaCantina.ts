import { ErroDeDominio } from '../../dominio/ErroDeDominio';
import { novaMovimentacao, type Movimentacao, type MotivoDaMovimentacao } from '../../dominio/estoque/Movimentacao';
import { resumirPeriodo, type Periodo, type ResumoDoPeriodo } from '../../dominio/estoque/resumirPeriodo';
import type { Pedido } from '../../dominio/pedido/Pedido';
import type { Produto } from '../../dominio/produto/Produto';
import type { Usuario } from '../../dominio/usuario/Usuario';
import { cantinaDe } from '../autorizacao';
import type { RepositorioDeMovimentacoes, RepositorioDeProdutos, Relogio } from '../portas';

/** O que a cantina registra à mão: tudo menos a venda do app, que entra sozinha. */
export type MotivoManual = Exclude<MotivoDaMovimentacao, 'venda-app'>;

export interface AlertasDeEstoque {
  readonly esgotados: readonly Produto[];
  readonly baixos: readonly Produto[];
}

/**
 * O pedaço que o painel da cantina e o estudante precisam para registrar a venda entregue.
 * Eles dependem só disto, não do estoque inteiro (Segregação de Interfaces).
 */
export type RegistroDeVendas = Pick<EstoqueDaCantina, 'registrarVendaDoApp'>;

const ITENS_NO_HISTORICO = 15;

/**
 * Acesso cantina: o estoque de verdade, inclusive o que acontece fora do app.
 * Cada entrada ou saída muda a quantidade e fica registrada no histórico, com data e hora,
 * e o mesmo histórico alimenta o Resumo do dia, da semana e do mês.
 */
export class EstoqueDaCantina {
  constructor(
    private readonly produtos: RepositorioDeProdutos,
    private readonly movimentacoes: RepositorioDeMovimentacoes,
    private readonly relogio: Relogio,
  ) {}

  /** Itens com estoque físico, do mais urgente (esgotado) ao mais tranquilo. */
  itens(quem: Usuario): Produto[] {
    const urgencia = { esgotado: 0, baixo: 1, ok: 2, 'sem-controle': 3 };
    return this.daCantina(quem)
      .filter((produto) => produto.nivelDeEstoque() !== 'sem-controle')
      .sort((a, b) => urgencia[a.nivelDeEstoque()] - urgencia[b.nivelDeEstoque()] || a.nome.localeCompare(b.nome));
  }

  alertas(quem: Usuario): AlertasDeEstoque {
    const produtos = this.daCantina(quem);
    return {
      esgotados: produtos.filter((p) => p.nivelDeEstoque() === 'esgotado'),
      baixos: produtos.filter((p) => p.nivelDeEstoque() === 'baixo'),
    };
  }

  /** Entrada (compra que chegou) ou saída fora do app (venda no balcão, perda). */
  registrar(quem: Usuario, dados: { produtoId: string; motivo: MotivoManual; quantidade: number }): Movimentacao {
    const produto = this.produtos.buscarPorId(dados.produtoId);
    if (!produto || produto.cantinaId !== cantinaDe(quem)) throw new ErroDeDominio('Escolha um produto da sua cantina.');
    const movimentacao = novaMovimentacao({
      cantinaId: produto.cantinaId,
      produtoId: produto.id,
      produtoNome: produto.nome,
      motivo: dados.motivo,
      quantidade: dados.quantidade,
      valorEmCentavos: dados.motivo === 'venda-balcao' ? produto.precoEmCentavos * dados.quantidade : 0,
      momento: this.relogio.instante(),
    });
    if (dados.motivo === 'compra') produto.reabastecer(dados.quantidade);
    else produto.darBaixa(dados.quantidade);
    this.produtos.salvar(produto);
    this.movimentacoes.registrar(movimentacao);
    return movimentacao;
  }

  /** Aba Resumo: o histórico filtrado e somado para o período (hoje, esta semana, este mês). */
  resumo(quem: Usuario, periodo: Periodo): ResumoDoPeriodo {
    return resumirPeriodo(this.movimentacoes.listar(cantinaDe(quem)), periodo, this.relogio.instante());
  }

  historico(quem: Usuario, limite = ITENS_NO_HISTORICO): Movimentacao[] {
    return this.movimentacoes
      .listar(cantinaDe(quem))
      .sort((a, b) => b.momento.localeCompare(a.momento))
      .slice(0, limite);
  }

  /**
   * Pedido do app entregue: vira saída no histórico. O estoque já tinha sido reservado quando
   * o estudante agendou, então aqui só registra (com o valor recebido).
   */
  registrarVendaDoApp(pedido: Pedido): void {
    const momento = this.relogio.instante();
    for (const item of pedido.itensParaListar()) {
      this.movimentacoes.registrar(novaMovimentacao({
        cantinaId: pedido.cantinaId,
        produtoId: item.produtoId,
        produtoNome: item.nome,
        motivo: 'venda-app',
        quantidade: item.quantidade,
        valorEmCentavos: item.precoUnitarioEmCentavos * item.quantidade,
        momento,
        pedidoNumero: pedido.numero,
      }));
    }
  }

  private daCantina(quem: Usuario): Produto[] {
    const cantinaId = cantinaDe(quem);
    return this.produtos.listar().filter((produto) => produto.cantinaId === cantinaId);
  }
}
