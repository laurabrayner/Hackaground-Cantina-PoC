import { ErroDeDominio } from '../ErroDeDominio';
import { Horario } from '../Horario';

/**
 * Um intervalo entre aulas (ex.: "Intervalo da noite", 20:00–20:15): a janela em que todo mundo
 * desce para a cantina ao mesmo tempo. Início e fim contam como dentro do intervalo.
 */
export class IntervaloDeAula {
  constructor(
    readonly nome: string,
    readonly inicio: Horario,
    readonly fim: Horario,
  ) {
    if (!inicio.ehAntesDe(fim)) throw new ErroDeDominio(`${nome}: o início precisa ser antes do fim.`);
  }

  static de(nome: string, inicio: string, fim: string): IntervaloDeAula {
    return new IntervaloDeAula(nome, Horario.de(inicio), Horario.de(fim));
  }

  inclui(horario: Horario): boolean {
    return !horario.ehAntesDe(this.inicio) && !this.fim.ehAntesDe(horario);
  }

  jaTerminou(agora: Horario): boolean {
    return this.fim.ehAntesDe(agora);
  }

  toString(): string {
    return `${this.inicio}–${this.fim}`;
  }
}
