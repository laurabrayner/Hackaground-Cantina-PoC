import type { Horario } from '../Horario';
import type { IntervaloDeAula } from './IntervaloDeAula';

/** Os intervalos do dia no campus, em ordem. A grade é dado: mudar um horário não muda código. */
export class GradeDeIntervalos {
  private readonly intervalos: readonly IntervaloDeAula[];

  constructor(intervalos: readonly IntervaloDeAula[]) {
    this.intervalos = [...intervalos].sort((a, b) => a.inicio.comparar(b.inicio));
  }

  /** O intervalo que está acontecendo agora ou, se nenhum, o próximo do dia. */
  proximo(agora: Horario): IntervaloDeAula | undefined {
    return this.intervalos.find((intervalo) => !intervalo.jaTerminou(agora));
  }
}
