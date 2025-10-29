import React from 'react';
import { HeroSection } from './HeroSection';

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onGetStarted }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <HeroSection />
      
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Funcionalidades Principais</h2>
          <p className="text-gray-600">Tudo o que precisa para gerir o seu inventário</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <FeatureCard
            icon="https://d64gsuwffb70l.cloudfront.net/68ffd88cfab1e11bf1fcc950_1761597642906_338a279c.webp"
            title="Importação Excel"
            description="Upload de ficheiros XLSX com mapeamento automático de colunas e validação"
          />
          <FeatureCard
            icon="https://d64gsuwffb70l.cloudfront.net/68ffd88cfab1e11bf1fcc950_1761597643668_a26accc4.webp"
            title="Classificação Inteligente"
            description="Regras de negócio automáticas para família, subfamília e tipo de artigo"
          />
          <FeatureCard
            icon="https://d64gsuwffb70l.cloudfront.net/68ffd88cfab1e11bf1fcc950_1761597644408_8e001528.webp"
            title="Detecção de Duplicados"
            description="Fuzzy matching ≥85% com fusão inteligente e histórico completo"
          />
          <FeatureCard
            icon="https://d64gsuwffb70l.cloudfront.net/68ffd88cfab1e11bf1fcc950_1761597646167_45c61c12.webp"
            title="Exportação Multi-formato"
            description="Excel, CSV e JSONL com todos os campos normalizados"
          />
        </div>
        
        <div className="text-center">
          <button
            onClick={onGetStarted}
            className="px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
          >
            Começar Agora →
          </button>
        </div>
      </div>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: any) => (
  <div className="bg-white rounded-lg shadow-lg p-6 text-center hover:shadow-xl transition-shadow">
    <img src={icon} alt={title} className="w-20 h-20 mx-auto mb-4 rounded-lg" />
    <h3 className="text-xl font-semibold mb-2">{title}</h3>
    <p className="text-gray-600 text-sm">{description}</p>
  </div>
);
