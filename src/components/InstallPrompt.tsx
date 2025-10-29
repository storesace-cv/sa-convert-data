import React, { useState, useEffect } from 'react';

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };
    
    window.addEventListener('beforeinstallprompt', handler);
    
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
  
  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    
    setDeferredPrompt(null);
  };
  
  if (!showPrompt) return null;
  
  return (
    <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-96 bg-white rounded-lg shadow-2xl p-6 z-50 border-2 border-blue-500">
      <button
        onClick={() => setShowPrompt(false)}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
      >
        ✕
      </button>
      
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <img 
            src="https://d64gsuwffb70l.cloudfront.net/68ffd88cfab1e11bf1fcc950_1761597642162_9675ae44.webp"
            alt="StoresAce"
            className="w-12 h-12 rounded-lg"
          />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-1">Instalar StoresAce</h3>
          <p className="text-sm text-gray-600 mb-4">
            Instale a app para acesso rápido e funcionalidade offline completa
          </p>
          <button
            onClick={handleInstall}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Instalar App
          </button>
        </div>
      </div>
    </div>
  );
};
