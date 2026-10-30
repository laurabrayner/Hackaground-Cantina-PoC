import { GradeDeIntervalos } from '../dominio/intervalo/GradeDeIntervalos';
import { IntervaloDeAula } from '../dominio/intervalo/IntervaloDeAula';

/**
 * Intervalos do campus (não há aulas à tarde). Mudou a grade? Muda só aqui.
 * O da noite começa às 20:00 ou às 20:15, conforme a aula: a janela cobre os dois casos.
 */
export const INTERVALOS_DO_CESAR = new GradeDeIntervalos([
  IntervaloDeAula.de('Intervalo da manhã', '10:00', '10:15'),
  IntervaloDeAula.de('Intervalo da noite', '20:00', '20:30'),
]);
