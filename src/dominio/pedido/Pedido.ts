import { ErroDeDominio } from '../ErroDeDominio';
import { Horario } from '../Horario';

export type StatusPedido = 'agendado' | 'pronto' | 'retirado' | 'cancelado';

/** Cópia do produto no momento da compra: se o preço mudar depois, o pedido não muda. */
export interface ItemPedido {
  readonly produtoId: string;
  readonly nome: string;
  readonly quantidade: number;
  readonly precoUnitarioEmCentavos: number;
  readonly tempoDePreparoMin: number;
}

export interface PedidoSalvo {
  readonly numero: number;
  readonly cantinaId: string;
  readonly clienteId: string;
  readonly cliente: string;
  readonly itens: readonly ItemPedido[];
  readonly horarioDeRetirada: string;
  readonly status: StatusPedido;
  readonly notas: Readonly<Record<string, number>>;
}

const NOTA_MINIMA = 1;
const NOTA_MAXIMA = 5;

/**
 * Pedido agendado por um estudante numa cantina. O status é privado: só muda pelos métodos
 * abaixo, que garantem a ordem agendado → pronto → retirado (Ocultamento de informação).
 * Saídas de emergência: o estudante cancela enquanto está agendado; a cantina desfaz um "pronto".
 * Depois de retirado, o estudante avalia cada item separadamente.
 */
export class Pedido {
  private _status: StatusPedido = 'agendado';
  private readonly notas = new Map<string, number>();
  private readonly _itens: readonly ItemPedido[];

  constructor(
    readonly numero: number,
    readonly cantinaId: string,
    readonly clienteId: string,
    /** Nome que a cantina chama no balcão. */
    readonly cliente: string,
    itens: readonly ItemPedido[],
    readonly horarioDeRetirada: Horario,
  ) {
    if (!clienteId || !cliente.trim()) throw new ErroDeDominio('Entre na sua conta para fazer o pedido.');
    if (itens.length === 0) throw new ErroDeDominio('O pedido está vazio.');
    this._itens = Object.freeze([...itens]);
  }

  get status(): StatusPedido {
    return this._status;
  }

  /** Ainda precisa de atenção da cantina (preparar ou entregar). */
  estaNaFila(): boolean {
    return this.estaAgendado() || this.estaPronto();
  }

  estaAgendado(): boolean {
    return this._status === 'agendado';
  }

  estaPronto(): boolean {
    return this._status === 'pronto';
  }

  foiRetirado(): boolean {
    return this._status === 'retirado';
  }

  foiCancelado(): boolean {
    return this._status === 'cancelado';
  }

  /** Itens só para exibir ou devolver ao estoque: quem decide algo usa os métodos abaixo. */
  itensParaListar(): readonly ItemPedido[] {
    return this._itens;
  }

  /** Só o que a cantina precisa cozinhar; pronta-entrega não entra na conta do preparo. */
  itensParaPreparar(): readonly ItemPedido[] {
    return this._itens.filter((item) => item.tempoDePreparoMin > 0);
  }

  /** O estudante já deu nota para tudo que levou. */
  estaTodoAvaliado(): boolean {
    return this._itens.every((item) => this.notas.has(item.produtoId));
  }

  totalEmCentavos(): number {
    return this._itens.reduce((soma, item) => soma + item.precoUnitarioEmCentavos * item.quantidade, 0);
  }

  /** Itens feitos na hora são preparados um depois do outro. */
  tempoDePreparoMin(): number {
    return this._itens.reduce((soma, item) => soma + item.tempoDePreparoMin * item.quantidade, 0);
  }

  /** Hora em que a cantina deve começar, para ficar pronto exatamente na retirada. */
  horarioParaComecar(): Horario {
    return this.horarioDeRetirada.menos(this.tempoDePreparoMin());
  }

  marcarPronto(): void {
    if (this._status !== 'agendado') throw new ErroDeDominio(`Pedido #${this.numero} já foi marcado como pronto.`);
    this._status = 'pronto';
  }

  desfazerPronto(): void {
    if (this._status !== 'pronto') throw new ErroDeDominio(`Pedido #${this.numero} não está marcado como pronto.`);
    this._status = 'agendado';
  }

  confirmarRetirada(): void {
    if (this._status !== 'pronto') throw new ErroDeDominio(`Pedido #${this.numero} ainda não está pronto.`);
    this._status = 'retirado';
  }

  cancelar(): void {
    if (this._status !== 'agendado') {
      throw new ErroDeDominio(`Pedido #${this.numero} já foi preparado e não pode ser cancelado. Fale com a cantina.`);
    }
    this._status = 'cancelado';
  }

  /** Cada item recebe a própria nota (1 a 5). Dá para mudar de ideia: a última nota vale. */
  avaliarItem(produtoId: string, nota: number): void {
    if (this._status !== 'retirado') throw new ErroDeDominio('Você pode avaliar depois de retirar o pedido.');
    if (!this._itens.some((item) => item.produtoId === produtoId)) throw new ErroDeDominio('Esse item não está no pedido.');
    if (!Number.isInteger(nota) || nota < NOTA_MINIMA || nota > NOTA_MAXIMA) {
      throw new ErroDeDominio(`A nota vai de ${NOTA_MINIMA} a ${NOTA_MAXIMA}.`);
    }
    this.notas.set(produtoId, nota);
  }

  notaDoItem(produtoId: string): number | undefined {
    return this.notas.get(produtoId);
  }

  /** Notas dadas até agora, por produto (para calcular a média do cardápio). */
  notasDadas(): ReadonlyMap<string, number> {
    return new Map(this.notas);
  }

  paraDados(): PedidoSalvo {
    return {
      numero: this.numero,
      cantinaId: this.cantinaId,
      clienteId: this.clienteId,
      cliente: this.cliente,
      itens: this._itens,
      horarioDeRetirada: this.horarioDeRetirada.toString(),
      status: this._status,
      notas: Object.fromEntries(this.notas),
    };
  }

  static deDados(dados: PedidoSalvo): Pedido {
    const pedido = new Pedido(
      dados.numero, dados.cantinaId, dados.clienteId, dados.cliente, dados.itens, Horario.de(dados.horarioDeRetirada),
    );
    pedido._status = dados.status;
    for (const [produtoId, nota] of Object.entries(dados.notas ?? {})) pedido.notas.set(produtoId, nota);
    return pedido;
  }
}
