import { ErroDeDominio } from '../../dominio/ErroDeDominio';
import type { Pedido } from '../../dominio/pedido/Pedido';
import type { Usuario } from '../../dominio/usuario/Usuario';
import { cantinaDe } from '../autorizacao';
import type { Notificador, RepositorioDePedidos } from '../portas';
import type { RegistroDeVendas } from './EstoqueDaCantina';

export interface ItemParaPreparar {
  readonly nome: string;
  readonly quantidade: number;
}

/**
 * Acesso cantina: "Visualizar pedidos agendados" e o preparo. A cantina só faz uma coisa:
 * marcar pronto. O aviso ao estudante sai sozinho e quem confirma a retirada é o próprio estudante.
 */
export class PainelDaCantina {
  constructor(
    private readonly pedidos: RepositorioDePedidos,
    private readonly notificador: Notificador,
    private readonly vendas: RegistroDeVendas,
  ) {}

  /** Fila da cantina: o que precisa começar primeiro aparece primeiro. */
  fila(quem: Usuario): Pedido[] {
    return this.daCantina(quem)
      .filter((pedido) => pedido.estaNaFila())
      .sort((a, b) => a.horarioParaComecar().comparar(b.horarioParaComecar()));
  }

  /** Soma o que ainda falta preparar, para fazer em lote ("5 tapiocas, 3 coxinhas"). */
  resumoDoQueFazer(quem: Usuario): ItemParaPreparar[] {
    const totais = new Map<string, number>();
    for (const pedido of this.daCantina(quem).filter((p) => p.estaAgendado())) {
      for (const item of pedido.itensParaPreparar()) {
        totais.set(item.nome, (totais.get(item.nome) ?? 0) + item.quantidade);
      }
    }
    return [...totais].map(([nome, quantidade]) => ({ nome, quantidade }));
  }

  marcarPronto(quem: Usuario, numero: number): void {
    const pedido = this.buscar(quem, numero);
    pedido.marcarPronto();
    this.pedidos.salvar(pedido);
    this.notificador.notificar({
      clienteId: pedido.clienteId,
      numeroDoPedido: pedido.numero,
      mensagem: `${pedido.cliente}, seu pedido #${pedido.numero} está pronto! Pode retirar no balcão.`,
    });
  }

  /** Toque errado no "Pronto": volta para a fila de preparo e o aviso some da tela do estudante. */
  desfazerPronto(quem: Usuario, numero: number): void {
    const pedido = this.buscar(quem, numero);
    pedido.desfazerPronto();
    this.pedidos.salvar(pedido);
  }

  /** Quando o estudante esquece de confirmar, a cantina fecha o pedido. */
  confirmarEntrega(quem: Usuario, numero: number): void {
    const pedido = this.buscar(quem, numero);
    pedido.confirmarRetirada();
    this.pedidos.salvar(pedido);
    this.vendas.registrarVendaDoApp(pedido);
  }

  private daCantina(quem: Usuario): Pedido[] {
    const cantinaId = cantinaDe(quem);
    return this.pedidos.listar().filter((pedido) => pedido.cantinaId === cantinaId);
  }

  private buscar(quem: Usuario, numero: number): Pedido {
    const pedido = this.pedidos.buscarPorNumero(numero);
    if (!pedido || pedido.cantinaId !== cantinaDe(quem)) throw new ErroDeDominio(`Pedido #${numero} não encontrado.`);
    return pedido;
  }
}
