import React from 'react';

export const HeroSection: React.FC = () => {
  return (
    <div className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <img 
          src="https://d64gsuwffb70l.cloudfront.net/68ffd88cfab1e11bf1fcc950_1761597641361_23b72849.webp"
          alt="Dashboard"
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="relative max-w-7xl mx-auto px-6 py-24">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <img 
              src="https://d64gsuwffb70l.cloudfront.net/68ffd88cfab1e11bf1fcc950_1761597642162_9675ae44.webp"
              alt="StoresAce Logo"
              className="w-24 h-24 rounded-2xl shadow-2xl"
            />
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            StoresAce
          </h1>
          
          <p className="text-xl md:text-2xl text-blue-200 mb-8 max-w-3xl mx-auto">
            Gestão Profissional de Artigos & Ingredientes para Restauração
          </p>
          
          <p className="text-lg text-slate-300 mb-12 max-w-2xl mx-auto">
            Importe, normalize, classifique e exporte dados com precisão. 
            Detecção inteligente de duplicados e sincronização offline.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <div className="bg-white/10 backdrop-blur-sm px-6 py-3 rounded-lg">
              <span className="text-3xl">📥</span>
              <p className="text-sm mt-1">Importação Excel</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm px-6 py-3 rounded-lg">
              <span className="text-3xl">🏷️</span>
              <p className="text-sm mt-1">Classificação</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm px-6 py-3 rounded-lg">
              <span className="text-3xl">🔍</span>
              <p className="text-sm mt-1">Duplicados</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm px-6 py-3 rounded-lg">
              <span className="text-3xl">📤</span>
              <p className="text-sm mt-1">Exportação</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
