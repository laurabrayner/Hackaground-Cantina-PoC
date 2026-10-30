import type { Aviso, Notificador } from '../aplicacao/portas';

const NOTAS_DO_SINO_HZ = [880, 1320];
const DURACAO_DA_NOTA_S = 0.18;

/**
 * Canal novo de aviso: notificação do navegador com som. Entrou no sistema só como esta classe
 * + uma linha em main.ts, dentro do NotificadorComposto. Nenhuma classe existente mudou (Aberto/Fechado).
 * Nesta PoC as duas contas usam o mesmo navegador; com um backend, seria uma notificação push.
 */
export class NotificadorDoNavegador implements Notificador {
  notificar(aviso: Aviso): void {
    this.tocarSino();
    if (!('Notification' in window) || Notification.permission === 'denied') return;
    if (Notification.permission === 'granted') {
      this.mostrar(aviso);
      return;
    }
    void Notification.requestPermission().then((permissao) => {
      if (permissao === 'granted') this.mostrar(aviso);
    });
  }

  private mostrar(aviso: Aviso): void {
    new Notification('Cantinas do CESAR', { body: aviso.mensagem, tag: `pedido-${aviso.numeroDoPedido}` });
  }

  /** "Plim-plim" curto, gerado na hora: não precisa de arquivo de áudio. */
  private tocarSino(): void {
    if (!('AudioContext' in window)) return;
    const audio = new AudioContext();
    NOTAS_DO_SINO_HZ.forEach((frequencia, indice) => {
      const inicio = audio.currentTime + indice * DURACAO_DA_NOTA_S;
      const oscilador = audio.createOscillator();
      const volume = audio.createGain();
      oscilador.frequency.value = frequencia;
      volume.gain.setValueAtTime(0.2, inicio);
      volume.gain.exponentialRampToValueAtTime(0.001, inicio + DURACAO_DA_NOTA_S);
      oscilador.connect(volume).connect(audio.destination);
      oscilador.start(inicio);
      oscilador.stop(inicio + DURACAO_DA_NOTA_S);
    });
  }
}
