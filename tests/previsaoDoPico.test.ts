import { beforeEach, describe, expect, it } from 'vitest';
import { PrevisaoPelosAgendados } from '../src/aplicacao/cantina/PrevisaoPelosAgendados';
import { Horario } from '../src/dominio/Horario';
import { GradeDeIntervalos } from '../src/dominio/intervalo/GradeDeIntervalos';
import { IntervaloDeAula } from '../src/dominio/intervalo/IntervaloDeAula';
import { montarCenario } from './cenario';

const GRADE = new GradeDeIntervalos([
  IntervaloDeAula.de('Intervalo da noite', '20:30', '20:45'),
  IntervaloDeAula.de('Intervalo da tarde', '15:00', '15:15'),
]);

let c: ReturnType<typeof montarCenario>;
let previsao: PrevisaoPelosAgendados;
beforeEach(() => {
  c = montarCenario(); // relógio parado às 20:00
  previsao = new PrevisaoPelosAgendados(c.pedidos, GRADE, c.relogio);
});

describe('Intervalos', () => {
  it('início e fim contam como dentro do intervalo', () => {
    const noite = IntervaloDeAula.de('Noite', '20:00', '20:15');
    expect(['20:00', '20:15'].every((h) => noite.inclui(Horario.de(h)))).toBe(true);
    expect(noite.inclui(Horario.de('20:16'))).toBe(false);
  });

  it('recusa intervalo que termina antes de começar', () => {
    expect(() => IntervaloDeAula.de('Errado', '20:15', '20:00')).toThrow('início precisa ser antes do fim');
  });

  it('a grade acha o que está acontecendo ou o próximo, mesmo fora de ordem', () => {
    expect(GRADE.proximo(Horario.de('12:00'))?.nome).toBe('Intervalo da tarde');
    expect(GRADE.proximo(Horario.de('20:40'))?.nome).toBe('Intervalo da noite');
    expect(GRADE.proximo(Horario.de('21:00'))).toBeUndefined();
  });
});

describe('Previsão do pico pelos pedidos agendados', () => {
  it('soma item por item só o que será retirado no próximo intervalo', () => {
    c.pedir(c.ana, '20:30', [[c.tapioca, 2], [c.refri, 1]]);
    c.pedir(c.beto, '20:45', [[c.tapioca, 2], [c.refri, 2]]);
    c.pedir(c.ana, '20:50', [[c.tapioca, 5]]); // depois do intervalo: não entra

    const resultado = previsao.proximoIntervalo(c.imperial.conta);
    expect(resultado?.intervalo.nome).toBe('Intervalo da noite');
    expect(resultado?.pedidos).toBe(2);
    expect(resultado?.itens).toEqual([
      { produtoId: c.tapioca.id, nome: 'Tapioca', quantidade: 4, feitoNaHora: true },
      { produtoId: c.refri.id, nome: 'Refri', quantidade: 3, feitoNaHora: false },
    ]);
  });

  it('diz quando começar para ter tudo pronto no início do intervalo', () => {
    c.pedir(c.ana, '20:30', [[c.tapioca, 2], [c.refri, 1]]); // 2 tapiocas × 6 min = 12 min
    expect(previsao.proximoIntervalo(c.imperial.conta)?.comecarAs?.toString()).toBe('20:18');
  });

  it('só de prateleira não tem hora de começar', () => {
    c.pedir(c.ana, '20:30', [[c.refri, 1]]);
    expect(previsao.proximoIntervalo(c.imperial.conta)?.comecarAs).toBeUndefined();
  });

  it('pedido já pronto ou cancelado não entra na conta', () => {
    const pronto = c.pedir(c.ana, '20:30', [[c.tapioca, 1]]);
    const cancelado = c.pedir(c.beto, '20:35', [[c.tapioca, 1]]);
    c.casos.painel.marcarPronto(c.imperial.conta, pronto.numero);
    c.casos.meusPedidos.cancelar(c.beto, cancelado.numero);
    expect(previsao.proximoIntervalo(c.imperial.conta)?.itens).toEqual([]);
  });

  it('cada cantina vê só a própria previsão', () => {
    c.pedir(c.ana, '20:30', [[c.tapioca, 1]]);
    expect(previsao.proximoIntervalo(c.cafe.conta)?.pedidos).toBe(0);
  });

  it('estudante não vê a previsão da cantina', () => {
    expect(() => previsao.proximoIntervalo(c.ana)).toThrow('não tem acesso');
  });

  it('marca quando o intervalo já está acontecendo e some depois do último', () => {
    c.relogio.avancarPara(new Date(2026, 9, 28, 20, 35));
    expect(previsao.proximoIntervalo(c.imperial.conta)?.acontecendoAgora).toBe(true);
    c.relogio.avancarPara(new Date(2026, 9, 28, 21, 0));
    expect(previsao.proximoIntervalo(c.imperial.conta)).toBeUndefined();
  });
});
