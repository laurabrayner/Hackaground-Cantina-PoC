import { describe, expect, it } from 'vitest';
import { ErroDeDominio } from '../src/dominio/ErroDeDominio';
import { Horario } from '../src/dominio/Horario';
import { Pedido, type ItemPedido } from '../src/dominio/pedido/Pedido';

const item = (nome: string, quantidade: number, tempoDePreparoMin: number, preco = 1000): ItemPedido => ({
  produtoId: nome, nome, quantidade, precoUnitarioEmCentavos: preco, tempoDePreparoMin,
});

describe('Horario', () => {
  it('lê e escreve HH:MM', () => {
    expect(Horario.de('8:05').toString()).toBe('08:05');
  });

  it('rejeita horário inválido', () => {
    expect(() => Horario.de('25:00')).toThrow(ErroDeDominio);
    expect(() => Horario.de('oito')).toThrow(ErroDeDominio);
  });

  it('faz contas com minutos', () => {
    expect(Horario.de('20:10').menos(15).toString()).toBe('19:55');
    expect(Horario.de('20:50').mais(15).toString()).toBe('21:05');
  });
});

describe('Pedido', () => {
  const pedido = () =>
    new Pedido(1, 'c1', 'ana', 'Ana', [item('Tapioca', 2, 6, 1000), item('Água', 1, 0, 500)], Horario.de('20:30'));

  it('soma total e tempo de preparo', () => {
    expect(pedido().totalEmCentavos()).toBe(2500);
    expect(pedido().tempoDePreparoMin()).toBe(12);
  });

  it('diz a hora para a tia começar', () => {
    expect(pedido().horarioParaComecar().toString()).toBe('20:18');
  });

  it('segue agendado → pronto → retirado', () => {
    const p = pedido();
    expect(p.status).toBe('agendado');
    p.marcarPronto();
    expect(p.status).toBe('pronto');
    p.confirmarRetirada();
    expect(p.status).toBe('retirado');
  });

  it('não pula etapas nem repete', () => {
    const p = pedido();
    expect(() => p.confirmarRetirada()).toThrow(ErroDeDominio);
    p.marcarPronto();
    expect(() => p.marcarPronto()).toThrow(ErroDeDominio);
  });

  it('exige cliente e pelo menos um item', () => {
    expect(() => new Pedido(1, 'c1', 'ana', ' ', [item('X', 1, 1)], Horario.de('20:00'))).toThrow(ErroDeDominio);
    expect(() => new Pedido(1, 'c1', 'ana', 'Ana', [], Horario.de('20:00'))).toThrow(ErroDeDominio);
  });
});

describe('Avaliação do pedido', () => {
  const retirado = () => {
    const p = new Pedido(1, 'c1', 'ana', 'Ana', [item('Tapioca', 1, 6), item('Água', 1, 0)], Horario.de('20:30'));
    p.marcarPronto();
    p.confirmarRetirada();
    return p;
  };

  it('nota de 1 a 5 por item; dá para mudar de ideia', () => {
    const p = retirado();
    p.avaliarItem('Tapioca', 4);
    p.avaliarItem('Tapioca', 5);
    expect(p.notaDoItem('Tapioca')).toBe(5);
    expect(p.notaDoItem('Água')).toBeUndefined();
  });

  it('recusa nota fora da escala e item que não está no pedido', () => {
    const p = retirado();
    expect(() => p.avaliarItem('Tapioca', 0)).toThrow(ErroDeDominio);
    expect(() => p.avaliarItem('Tapioca', 4.5)).toThrow(ErroDeDominio);
    expect(() => p.avaliarItem('Coxinha', 5)).toThrow('não está no pedido');
  });
});

describe('Pedido guarda o que é dele', () => {
  it('responde em que ponto está, sem entregar a string do status', () => {
    const pedido = new Pedido(1, 'c1', 'e1', 'Ana', [item('Tapioca', 1, 6)], Horario.de('20:30'));
    expect(pedido.estaAgendado()).toBe(true);
    expect(pedido.estaPronto()).toBe(false);

    pedido.marcarPronto();
    expect(pedido.estaAgendado()).toBe(false);
    expect(pedido.estaPronto()).toBe(true);

    pedido.confirmarRetirada();
    expect(pedido.foiRetirado()).toBe(true);
    expect(pedido.estaNaFila()).toBe(false);
  });

  it('separa o que a cantina precisa cozinhar do que é pronta-entrega', () => {
    const pedido = new Pedido(1, 'c1', 'e1', 'Ana',
      [item('Tapioca', 1, 6), item('Refri', 2, 0)], Horario.de('20:30'));

    expect(pedido.itensParaListar()).toHaveLength(2);
    expect(pedido.itensParaPreparar().map((i) => i.nome)).toEqual(['Tapioca']);
  });

  it('sabe sozinho quando já foi todo avaliado', () => {
    const pedido = new Pedido(1, 'c1', 'e1', 'Ana', [item('Tapioca', 1, 6)], Horario.de('20:30'));
    pedido.marcarPronto();
    pedido.confirmarRetirada();
    expect(pedido.estaTodoAvaliado()).toBe(false);

    for (const item of pedido.itensParaListar()) pedido.avaliarItem(item.produtoId, 5);
    expect(pedido.estaTodoAvaliado()).toBe(true);
  });
});
