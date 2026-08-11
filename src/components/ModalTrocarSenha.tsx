import React, { useState } from 'react';
import { Button, Input, Modal } from './ui';

interface ModalTrocarSenhaProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (senhaAtual: string, novaSenha: string) => void;
}

const MINIMO_SENHA = 6;

const ModalTrocarSenha: React.FC<ModalTrocarSenhaProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [repitaSenha, setRepitaSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const limpar = () => {
    setSenhaAtual('');
    setNovaSenha('');
    setRepitaSenha('');
    setErro(null);
  };

  const fechar = () => {
    limpar();
    onClose();
  };

  /**
   * Erro do primeiro campo que não passa, ou `null`.
   *
   * A ordem segue a leitura do formulário: de nada adianta reclamar da
   * confirmação enquanto a senha nova ainda está vazia.
   */
  const validar = (): string | null => {
    if (!senhaAtual) return 'Digite sua senha atual.';
    if (!novaSenha) return 'Digite a nova senha.';
    if (novaSenha.length < MINIMO_SENHA)
      return `A nova senha precisa de pelo menos ${MINIMO_SENHA} caracteres.`;
    if (novaSenha === senhaAtual) return 'A nova senha é igual à atual.';
    if (novaSenha !== repitaSenha) return 'A confirmação não confere com a nova senha.';
    return null;
  };

  const confirmar = (e: React.FormEvent) => {
    e.preventDefault();

    const problema = validar();
    if (problema) {
      setErro(problema);
      return;
    }

    onConfirm(senhaAtual, novaSenha);
    limpar();
    onClose();
  };

  const rotulo = 'mb-1.5 block text-sm font-medium text-conteudo-suave';

  return (
    <Modal aberto={isOpen} aoFechar={fechar} titulo="Trocar senha" largura="sm">
      <form onSubmit={confirmar} className="space-y-4">
        {erro && (
          <div className="rounded-lg border border-perigo/30 bg-perigo/10 px-4 py-3 text-sm text-perigo-forte dark:text-perigo-suave">
            {erro}
          </div>
        )}

        <div>
          <label htmlFor="senha-atual" className={rotulo}>
            Senha atual
          </label>
          <Input
            id="senha-atual"
            type="password"
            autoComplete="current-password"
            value={senhaAtual}
            onChange={(e) => setSenhaAtual(e.target.value)}
            placeholder="Digite sua senha atual"
          />
        </div>

        <div>
          <label htmlFor="nova-senha" className={rotulo}>
            Nova senha
          </label>
          <Input
            id="nova-senha"
            type="password"
            autoComplete="new-password"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            placeholder={`Mínimo ${MINIMO_SENHA} caracteres`}
          />
        </div>

        <div>
          <label htmlFor="repita-senha" className={rotulo}>
            Repita a nova senha
          </label>
          <Input
            id="repita-senha"
            type="password"
            autoComplete="new-password"
            value={repitaSenha}
            onChange={(e) => setRepitaSenha(e.target.value)}
            placeholder="Repita a nova senha"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variante="secundario" onClick={fechar}>
            Cancelar
          </Button>
          <Button type="submit">Trocar senha</Button>
        </div>
      </form>
    </Modal>
  );
};

export default ModalTrocarSenha;
