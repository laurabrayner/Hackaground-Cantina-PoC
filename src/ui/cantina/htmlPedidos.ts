import type { ItemParaPreparar } from '../../aplicacao/cantina/PainelDaCantina';
import type { Horario } from '../../dominio/Horario';
import type { Pedido } from '../../dominio/pedido/Pedido';
import { escapar, formatarPreco } from '../formatacao';
import { icone } from '../icones';

/** Aba "Pedidos": o que preparar em lote e a fila na ordem de começar. */
export function htmlPedidos(fila: readonly Pedido[], resumo: readonly ItemParaPreparar[], agora: Horario): string {
  if (fila.length === 0) {
    return `<p class="vazio">${icone('vazio')}Nenhum pedido agendado ainda.<br />Os pedidos dos estudantes aparecem aqui sozinhos, na ordem de preparo.</p>`;
  }
  const htmlResumo = resumo.length
    ? `<section class="resumo">
         <h3 class="subtitulo">Para preparar</h3>
         <ul class="etiquetas">${resumo.map((i) => `<li><b>${i.quantidade}×</b> ${escapar(i.nome)}</li>`).join('')}</ul>
       </section>`
    : '';
  return `${htmlResumo}<div class="fila">${fila.map((pedido) => htmlPedido(pedido, agora)).join('')}</div>`;
}

function htmlPedido(pedido: Pedido, agora: Horario): string {
  const urgente = pedido.estaAgendado() && !agora.ehAntesDe(pedido.horarioParaComecar());
  const acao =
    pedido.estaAgendado()
      ? `<small class="${urgente ? 'texto-urgente' : ''}">${urgente ? `${icone('relogio')}Começar agora` : `Começar às ${pedido.horarioParaComecar()}`}</small>
         <button class="botao botao-pronto" data-acao="pronto" data-numero="${pedido.numero}">${icone('confirmar')}Pronto</button>`
      : `<small>${icone('sino')}Aviso enviado para ${escapar(pedido.cliente)}</small>
         <span>
           <button class="botao-link" data-acao="desfazer" data-numero="${pedido.numero}">Desfazer</button>
           <button class="botao-link" data-acao="entregue" data-numero="${pedido.numero}">Já entreguei</button>
         </span>`;
  return `
    <article class="pedido pedido-${pedido.status} ${urgente ? 'pedido-urgente' : ''}">
      <header>
        <span class="numero">#${pedido.numero}</span>
        <strong>${escapar(pedido.cliente)}</strong>
        <span class="retirada">retira ${pedido.horarioDeRetirada}</span>
      </header>
      <ul class="itens">${pedido.itensParaListar().map((i) => `<li>${i.quantidade}× ${escapar(i.nome)}</li>`).join('')}</ul>
      <p class="receber">Receber <b>${formatarPreco(pedido.totalEmCentavos())}</b></p>
      <footer>${acao}</footer>
    </article>`;
}
