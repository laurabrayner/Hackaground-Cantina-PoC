import type { GradeDeIntervalos } from '../../dominio/intervalo/GradeDeIntervalos';
import type { IntervaloDeAula } from '../../dominio/intervalo/IntervaloDeAula';
import type { Pedido } from '../../dominio/pedido/Pedido';
import type { Usuario } from '../../dominio/usuario/Usuario';
import { cantinaDe } from '../autorizacao';
import type { RepositorioDePedidos, Relogio } from '../portas';
import type { ItemPrevisto, PrevisaoDeDemanda, PrevisaoDoIntervalo } from './PrevisaoDeDemanda';

/**
 * Prevê o pico a partir dos pedidos já agendados: soma, item por item, o que os estudantes
 * vão retirar dentro do próximo intervalo. Pedidos já prontos não entram (já foram feitos).
 */
export class PrevisaoPelosAgendados implements PrevisaoDeDemanda {
  constructor(
    private readonly pedidos: RepositorioDePedidos,
    private readonly grade: GradeDeIntervalos,
    private readonly relogio: Relogio,
  ) {}

  proximoIntervalo(quem: Usuario): PrevisaoDoIntervalo | undefined {
    const cantinaId = cantinaDe(quem);
    const agora = this.relogio.agora();
    const intervalo = this.grade.proximo(agora);
    if (!intervalo) return undefined;

    const doIntervalo = this.agendadosNoIntervalo(cantinaId, intervalo);
    const minutosDePreparo = doIntervalo.reduce((soma, pedido) => soma + pedido.tempoDePreparoMin(), 0);
    return {
      intervalo,
      acontecendoAgora: intervalo.inclui(agora),
      pedidos: doIntervalo.length,
      itens: somarItens(doIntervalo),
      comecarAs: minutosDePreparo > 0 ? intervalo.inicio.menos(minutosDePreparo) : undefined,
    };
  }

  private agendadosNoIntervalo(cantinaId: string, intervalo: IntervaloDeAula): Pedido[] {
    return this.pedidos
      .listar()
      .filter((p) => p.cantinaId === cantinaId && p.status === 'agendado' && intervalo.inclui(p.horarioDeRetirada));
  }
}

function somarItens(pedidos: readonly Pedido[]): ItemPrevisto[] {
  const totais = new Map<string, ItemPrevisto>();
  for (const { produtoId, nome, quantidade, tempoDePreparoMin } of pedidos.flatMap((p) => p.itens)) {
    const anterior = totais.get(produtoId)?.quantidade ?? 0;
    totais.set(produtoId, { produtoId, nome, quantidade: anterior + quantidade, feitoNaHora: tempoDePreparoMin > 0 });
  }
  return [...totais.values()].sort((a, b) => b.quantidade - a.quantidade || a.nome.localeCompare(b.nome));
}
