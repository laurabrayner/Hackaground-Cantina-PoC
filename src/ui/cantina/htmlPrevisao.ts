import type { PrevisaoDoIntervalo } from '../../aplicacao/cantina/PrevisaoDeDemanda';
import type { Horario } from '../../dominio/Horario';
import { escapar } from '../formatacao';
import { icone } from '../icones';

/** Cartão "Previsão do pico", no topo da aba Pedidos. */
export function htmlPrevisao(previsao: PrevisaoDoIntervalo | undefined, agora: Horario): string {
  const titulo = `<h3 class="subtitulo">${icone('grafico')}Previsão do pico</h3>`;
  if (!previsao) return `<section class="resumo previsao">${titulo}<p class="dica">Não há mais intervalos hoje.</p></section>`;

  const { intervalo, acontecendoAgora, pedidos, itens, comecarAs } = previsao;
  const quando = `${escapar(intervalo.nome)}, ${intervalo}${acontecendoAgora ? ' (acontecendo agora)' : ''}`;
  if (itens.length === 0) {
    return `<section class="resumo previsao">${titulo}<p class="dica">${quando}: nenhum pedido agendado ainda.</p></section>`;
  }
  const etiquetas = itens.map(
    (i) => `<li><b>${i.quantidade}×</b> ${escapar(i.nome)} <small>${i.feitoNaHora ? 'preparar' : 'separar'}</small></li>`,
  );
  return `
    <section class="resumo previsao">
      ${titulo}
      <p class="dica">${quando}: ${pedidos} ${pedidos === 1 ? 'pedido agendado' : 'pedidos agendados'}.</p>
      <ul class="etiquetas">${etiquetas.join('')}</ul>
      ${acontecendoAgora ? '' : htmlComecar(comecarAs, agora)}
    </section>`;
}

function htmlComecar(comecarAs: Horario | undefined, agora: Horario): string {
  if (!comecarAs) return '';
  const atrasado = !agora.ehAntesDe(comecarAs);
  return atrasado
    ? `<p class="dica texto-urgente">${icone('relogio')}Comece agora para ter tudo pronto no início do intervalo.</p>`
    : `<p class="dica">Comece às <b>${comecarAs}</b> para ter tudo pronto no início do intervalo.</p>`;
}
