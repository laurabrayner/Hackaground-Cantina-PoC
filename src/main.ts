import '@fontsource/barlow/400.css';
import '@fontsource/barlow/700.css';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/700.css';
import './ui/estilos.css';
import './ui/estilos-painel.css';
import { Autenticacao } from './aplicacao/acesso/Autenticacao';
import { CadastrarEstudante } from './aplicacao/acesso/CadastrarEstudante';
import { CadastrarProduto } from './aplicacao/cantina/CadastrarProduto';
import { ConfigurarCantina } from './aplicacao/cantina/ConfigurarCantina';
import { EstoqueDaCantina } from './aplicacao/cantina/EstoqueDaCantina';
import { GerenciarCardapio } from './aplicacao/cantina/GerenciarCardapio';
import { PainelDaCantina } from './aplicacao/cantina/PainelDaCantina';
import { PrevisaoPelosAgendados } from './aplicacao/cantina/PrevisaoPelosAgendados';
import { ReporEstoque } from './aplicacao/cantina/ReporEstoque';
import { CadastrarCantina } from './aplicacao/cesar/CadastrarCantina';
import { VisaoGeralDasCantinas } from './aplicacao/cesar/VisaoGeralDasCantinas';
import { AgendarCompra } from './aplicacao/estudante/AgendarCompra';
import { ConsultarCantinas } from './aplicacao/estudante/ConsultarCantinas';
import { PedidosDoEstudante } from './aplicacao/estudante/PedidosDoEstudante';
import type { Usuario } from './dominio/usuario/Usuario';
import {
  aoMudarEmOutraAba, apagarDadosLocais, CaixaDeAvisosLocal, RepositorioDeCantinasLocal, RepositorioDeMovimentacoesLocal,
  RepositorioDePedidosLocal, RepositorioDeProdutosLocal, RepositorioDeUsuariosLocal, SessaoDaAba,
} from './infra/armazenamentoLocal';
import { CONTAS_DE_DEMONSTRACAO, prepararDadosDeDemonstracao } from './infra/dadosDeDemonstracao';
import { INTERVALOS_DO_CESAR } from './infra/intervalosDoCesar';
import { NotificadorComposto } from './infra/notificadores';
import { NotificadorDoNavegador } from './infra/NotificadorDoNavegador';
import { RelogioDoSistema } from './infra/RelogioDoSistema';
import { App } from './ui/App';
import type { Tela } from './ui/Tela';
import { TelaCantina } from './ui/TelaCantina';
import { TelaCesar } from './ui/TelaCesar';
import { TelaEstudante } from './ui/TelaEstudante';
import { TelaLogin } from './ui/TelaLogin';

/*
 * Raiz de composição: o ÚNICO lugar que conhece as classes concretas.
 * Para guardar tudo só em memória (ou ir para um backend), basta trocar as implementações
 * abaixo por outras das mesmas portas. Nenhum caso de uso muda.
 */
const cantinas = new RepositorioDeCantinasLocal();
const produtos = new RepositorioDeProdutosLocal();
const pedidos = new RepositorioDePedidosLocal();
const movimentacoes = new RepositorioDeMovimentacoesLocal();
const usuarios = new RepositorioDeUsuariosLocal();
const sessao = new SessaoDaAba();
const relogio = new RelogioDoSistema();
const caixaDeAvisos = new CaixaDeAvisosLocal();
const notificador = new NotificadorComposto([caixaDeAvisos, new NotificadorDoNavegador()]);

// Acesso (todos)
const autenticacao = new Autenticacao(usuarios, sessao);
const cadastrarEstudante = new CadastrarEstudante(usuarios, sessao);
// CESAR
const cadastrarCantina = new CadastrarCantina(cantinas, usuarios);
const visaoGeral = new VisaoGeralDasCantinas(cantinas, produtos, pedidos);
// Cantina
const cadastrarProduto = new CadastrarProduto(produtos);
const gerenciarCardapio = new GerenciarCardapio(produtos);
const estoqueDaCantina = new EstoqueDaCantina(produtos, movimentacoes, relogio);
const reporEstoque = new ReporEstoque(produtos, estoqueDaCantina);
const painelDaCantina = new PainelDaCantina(pedidos, notificador, estoqueDaCantina);
const configurarCantina = new ConfigurarCantina(cantinas);
const previsaoDoPico = new PrevisaoPelosAgendados(pedidos, INTERVALOS_DO_CESAR, relogio);
// Estudante
const consultarCantinas = new ConsultarCantinas(cantinas, produtos, pedidos);
const agendarCompra = new AgendarCompra(produtos, pedidos, relogio);
const pedidosDoEstudante = new PedidosDoEstudante(pedidos, produtos, estoqueDaCantina);

const prepararDados = () =>
  prepararDadosDeDemonstracao({ cantinas, usuarios, produtos, movimentacoes }, cadastrarCantina, cadastrarProduto);
prepararDados();

function criarTela(usuario: Usuario | undefined): Tela {
  if (!usuario) {
    return new TelaLogin({
      autenticacao,
      cadastrarEstudante,
      contasDeDemonstracao: CONTAS_DE_DEMONSTRACAO,
      restaurarDemonstracao: () => {
        apagarDadosLocais();
        prepararDados();
      },
    });
  }
  switch (usuario.perfil) {
    case 'cesar':
      return new TelaCesar({ usuario, visaoGeral, cadastrarCantina });
    case 'cantina':
      return new TelaCantina({
        usuario, painel: painelDaCantina, cardapio: gerenciarCardapio, estoque: estoqueDaCantina, repor: reporEstoque,
        cadastrar: cadastrarProduto, configurar: configurarCantina, previsao: previsaoDoPico, relogio,
      });
    case 'estudante':
      return new TelaEstudante({
        usuario, avisos: caixaDeAvisos, cantinas: consultarCantinas, agendarCompra, pedidos: pedidosDoEstudante, relogio,
      });
  }
}

const raiz = document.querySelector<HTMLElement>('#app');
if (raiz) new App(raiz, { autenticacao, criarTela, aoMudarEmOutraAba });
