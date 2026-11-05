import { ErroDeDominio } from '../../dominio/ErroDeDominio';
import type { Pedido } from '../../dominio/pedido/Pedido';
import type { Usuario } from '../../dominio/usuario/Usuario';
import { exigirPerfil } from '../autorizacao';
import type { RegistroDeVendas } from '../cantina/EstoqueDaCantina';
import type { RepositorioDePedidos, RepositorioDeProdutos } from '../portas';

/** Acesso estudante: acompanhar, retirar, cancelar e avaliar os próprios pedidos. */
export class PedidosDoEstudante {
  constructor(
    private readonly pedidos: RepositorioDePedidos,
    private readonly produtos: RepositorioDeProdutos,
    private readonly vendas: RegistroDeVendas,
  ) {}

  meusPedidos(quem: Usuario): Pedido[] {
    exigirPerfil(quem, 'estudante');
    return this.pedidos
      .listar()
      .filter((pedido) => pedido.clienteId === quem.id)
      .sort((a, b) => b.numero - a.numero);
  }

  confirmarRetirada(quem: Usuario, numero: number): void {
    const pedido = this.meu(quem, numero);
    pedido.confirmarRetirada();
    this.pedidos.salvar(pedido);
    this.vendas.registrarVendaDoApp(pedido);
  }

  /** Desistiu antes do preparo: o pedido sai da fila e o estoque volta sozinho. */
  cancelar(quem: Usuario, numero: number): void {
    const pedido = this.meu(quem, numero);
    pedido.cancelar();
    for (const item of pedido.itensParaListar()) {
      const produto = this.produtos.buscarPorId(item.produtoId);
      if (!produto) continue;
      produto.liberar(item.quantidade);
      this.produtos.salvar(produto);
    }
    this.pedidos.salvar(pedido);
  }

  /** Depois de retirar, cada item do pedido recebe a sua nota. */
  avaliarItem(quem: Usuario, numero: number, produtoId: string, nota: number): void {
    const pedido = this.meu(quem, numero);
    pedido.avaliarItem(produtoId, nota);
    this.pedidos.salvar(pedido);
  }

  private meu(quem: Usuario, numero: number): Pedido {
    exigirPerfil(quem, 'estudante');
    const pedido = this.pedidos.buscarPorNumero(numero);
    if (!pedido || pedido.clienteId !== quem.id) throw new ErroDeDominio(`Pedido #${numero} não encontrado.`);
    return pedido;
  }
}
