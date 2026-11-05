import type { Cantina } from '../../dominio/cantina/Cantina';
import { mediaGeral, resumirAvaliacoes, type ResumoDeAvaliacao } from '../../dominio/pedido/resumirAvaliacoes';
import type { Usuario } from '../../dominio/usuario/Usuario';
import { exigirPerfil } from '../autorizacao';
import type { RepositorioDeCantinas, RepositorioDePedidos, RepositorioDeProdutos } from '../portas';

export interface SituacaoDaCantina {
  readonly cantina: Cantina;
  readonly produtosNoCardapio: number;
  readonly pedidosNaFila: number;
  readonly pedidosEntregues: number;
  readonly avaliacao?: ResumoDeAvaliacao;
}

/** Acesso CESAR: como está cada cantina do campus, num relance. */
export class VisaoGeralDasCantinas {
  constructor(
    private readonly cantinas: RepositorioDeCantinas,
    private readonly produtos: RepositorioDeProdutos,
    private readonly pedidos: RepositorioDePedidos,
  ) {}

  executar(quem: Usuario): SituacaoDaCantina[] {
    exigirPerfil(quem, 'cesar');
    const todosOsProdutos = this.produtos.listar();
    const todosOsPedidos = this.pedidos.listar();
    return this.cantinas.listar().map((cantina) => {
      const pedidos = todosOsPedidos.filter((p) => p.cantinaId === cantina.id);
      return {
        cantina,
        produtosNoCardapio: todosOsProdutos.filter((p) => p.cantinaId === cantina.id && p.estaNoCardapio).length,
        pedidosNaFila: pedidos.filter((p) => p.estaNaFila()).length,
        pedidosEntregues: pedidos.filter((p) => p.foiRetirado()).length,
        avaliacao: mediaGeral(resumirAvaliacoes(pedidos).values()),
      };
    });
  }
}
