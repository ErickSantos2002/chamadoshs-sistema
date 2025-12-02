import { useContext } from 'react';
import { ChamadosContext } from '../context/ChamadosContext';

export const useChamados = () => {
  const context = useContext(ChamadosContext);

  if (!context) {
    throw new Error('useChamados deve ser usado dentro de um ChamadosProvider');
  }

  return context;
};
