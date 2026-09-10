import React, { useState } from 'react';
import logo from '../assets/HS2.ico';

const CentralButton: React.FC = () => {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    window.open('https://centralhs.healthsafetytech.com', '_blank');
  };

  return (
    <>
      {/* Botão Flutuante */}
      <button
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group fixed bottom-6 right-6 z-30 flex items-center justify-center rounded-full border border-borda bg-superficie shadow-lg transition-all duration-300 ease-in-out hover:bg-superficie-elevada hover:shadow-xl"
        style={{
          width: '64px',
          height: '64px',
          transform: isHovered ? 'scale(1.1)' : 'scale(1)',
        }}
        aria-label="Ir para Central HS"
      >
        {/* O pulso saiu, e não por gosto.
         *
         * Era `animate-ping` com 2s, em laço, e o `App.tsx` renderiza este
         * botão em TODAS as telas. A §22 do prompt mestre é literal:
         *
         *   "nada pisca em laço numa tela aberta o dia inteiro — exceções:
         *    `Spinner` e `hs-logo-pulse` no login"
         *
         * Este não é nenhum dos dois. Era animação decorativa perpétua no canto
         * da tela de quem passa o dia no sistema — e o próprio comentário a
         * chamava de "opcional", o que é a confissão de que não carregava
         * função nenhuma.
         *
         * O botão continua se anunciando: tem `hover:bg-superficie-elevada`,
         * `hover:shadow-xl` e a escala no `isHovered`. O que sumiu foi o que
         * chamava atenção sem ninguém pedir.
         */}

        {/* Logo */}
        <img
          src={logo}
          alt="Central HS"
          className="relative h-10 w-10 object-contain transition-transform duration-300 group-hover:rotate-12"
        />
      </button>

      {/* Tooltip */}
      {isHovered && (
        <div
          className="animate-fadeIn fixed bottom-6 z-30 whitespace-nowrap rounded-lg border border-borda bg-superficie px-3 py-2 text-sm font-medium text-conteudo shadow-lg"
          style={{
            right: '90px',
          }}
        >
          Central HS
          {/* Seta do tooltip */}
          <div className="absolute top-1/2 -right-1 h-2 w-2 -translate-y-1/2 rotate-45 border-r border-t border-borda bg-superficie" />
        </div>
      )}
    </>
  );
};

export default CentralButton;
