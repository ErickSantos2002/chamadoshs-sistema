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
        className="group fixed bottom-6 right-6 z-50 flex items-center justify-center rounded-full border border-borda bg-superficie shadow-lg transition-all duration-300 ease-in-out hover:bg-superficie-elevada hover:shadow-xl"
        style={{
          width: '64px',
          height: '64px',
          transform: isHovered ? 'scale(1.1)' : 'scale(1)',
        }}
        aria-label="Ir para Central HS"
      >
        {/* Efeito de pulso (opcional) */}
        <span
          className="absolute inline-flex h-full w-full rounded-full bg-sinal/20 animate-ping"
          style={{ animationDuration: '2s' }}
        />

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
          className="animate-fadeIn fixed bottom-6 z-50 whitespace-nowrap rounded-lg border border-borda bg-superficie px-3 py-2 text-sm font-medium text-conteudo shadow-lg"
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
