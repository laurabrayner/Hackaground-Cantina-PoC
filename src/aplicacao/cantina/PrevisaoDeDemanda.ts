import type { Horario } from '../../dominio/Horario';
import type { IntervaloDeAula } from '../../dominio/intervalo/IntervaloDeAula';
import type { Usuario } from '../../dominio/usuario/Usuario';

export interface ItemPrevisto {
  readonly produtoId: string;
  readonly nome: string;
  readonly quantidade: number;
  /** Feito na hora (preparar) ou de prateleira (só separar). */
  readonly feitoNaHora: boolean;
}

export interface PrevisaoDoIntervalo {
  readonly intervalo: IntervaloDeAula;
  readonly acontecendoAgora: boolean;
  readonly pedidos: number;
  /** Do mais pedido para o menos pedido. */
  readonly itens: readonly ItemPrevisto[];
  /** Quando começar o que é feito na hora para estar tudo pronto no início do intervalo. */
  readonly comecarAs: Horario | undefined;
}

/**
 * Previsão do pico: quanto de cada item a cantina deve preparar para o próximo intervalo.
 * A tela depende só desta interface (Inversão de Dependências). Outro jeito de prever, como
 * somar a média do balcão nos dias anteriores, é uma classe nova ligada em main.ts, e nenhuma
 * tela muda (Aberto/Fechado).
 */
export interface PrevisaoDeDemanda {
  /** undefined quando não há mais intervalo hoje. */
  proximoIntervalo(quem: Usuario): PrevisaoDoIntervalo | undefined;
}
