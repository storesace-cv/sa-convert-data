import React, { useState, useEffect } from 'react';
import { DataTable } from './DataTable';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { Dashboard } from './Dashboard';
import { ImportModule } from './ImportModule';
import { ClassifyModule } from './ClassifyModule';
import { DuplicatesModule } from './DuplicatesModule';
import { ExportModule } from './ExportModule';
import { MetricsModule } from './MetricsModule';
import { RulesManager } from './RulesManager';
import { CommandPalette } from './CommandPalette';
import { KeyboardShortcuts } from './KeyboardShortcuts';
import { Toast } from './Toast';
import { WelcomeScreen } from './WelcomeScreen';
import { InstallPrompt } from './InstallPrompt';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { ProfileManagement } from './ProfileManagement';
import { useAuth } from '@/contexts/AuthContext';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useIndexedDB } from '@/hooks/useIndexedDB';
import { ItemCanonico } from '@/types/item';
import { mockItems } from '@/data/mockData';
import { normalizeDescription } from '@/utils/normalization';



const AppLayout: React.FC = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register' | 'forgot'>('login');
  const [activeModule, setActiveModule] = useState('dashboard');
  const [items, setItems] = useState<ItemCanonico[]>(mockItems);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  
  const { isOnline, pendingOps, queueOperation } = useOfflineSync();
  const { saveItems, loadItems } = useIndexedDB();
  
  useEffect(() => {
    loadItems().then(loaded => {
      if (loaded.length > 0) setItems(loaded);
    });
  }, []);
  
  const handleImport = (data: any[]) => {
    const normalized = data.map(d => ({
      ...d,
      id: Math.random().toString(36),
      descricao: normalizeDescription(d.descricao),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    setItems(prev => [...prev, ...normalized]);
    saveItems([...items, ...normalized]);
    addAuditLog('Importação', normalized.length + ' artigos');
    showToast('Importação concluída com sucesso', 'success');
  };
  const handleClassify = (updatedItems: ItemCanonico[]) => {
    setItems(updatedItems);
    saveItems(updatedItems);
    addAuditLog('Classificação', `${updatedItems.length} artigos atualizados`);
    showToast('Classificação aplicada com sucesso', 'success');
  };

  
  const handleMerge = (originalId: string, duplicateIds: string[]) => {
    const updated = items.map(item => {
      if (item.id === originalId) {
        const dupCodes = duplicateIds.map(id => items.find(i => i.id === id)?.codigo_antigo).join(' - ');
        return { ...item, duplicado: dupCodes };
      }
      if (duplicateIds.includes(item.id)) {
        const original = items.find(i => i.id === originalId);
        return { ...item, duplicado: original?.codigo_antigo || '' };
      }
      return item;
    });
    setItems(updated);
    saveItems(updated);
    addAuditLog('Fusão', 'Duplicados fundidos');
    showToast('Duplicados fundidos com sucesso', 'success');
  };
  
  const handleEdit = (id: string, field: string, value: any) => {
    const updated = items.map(item => item.id === id ? { ...item, [field]: value } : item);
    setItems(updated);
    saveItems(updated);
  };
  
  const handleDelete = (id: string) => {
    const updated = items.filter(item => item.id !== id);
    setItems(updated);
    saveItems(updated);
    addAuditLog('Eliminação', 'Artigo eliminado');
  };
  
  const addAuditLog = (action: string, details: string) => {
    setAuditLog(prev => [...prev, {
      action,
      details,
      user: 'admin',
      timestamp: new Date().toLocaleString('pt-PT')
    }]);
  };
  
  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
  };
  
  const handleShortcut = (action: string) => {
    if (action === 'import') setActiveModule('import');
    else if (action === 'export') setActiveModule('export');
    else if (action === 'command') setCommandPaletteOpen(true);
    else if (action === 'save') showToast('Guardado automaticamente', 'info');
  };
  
  const handleCommand = (cmd: string) => {
    if (['import', 'classify', 'duplicates', 'export'].includes(cmd)) {
      setActiveModule(cmd);
    }
  };
  
  const stats = {
    total: items.length,
    normalized: items.filter(i => i.descricao === i.descricao.toUpperCase()).length,
    classified: items.filter(i => i.familia || i.subfamilia).length,
    duplicates: 0
  };
  
  
  // Show loading spinner while checking auth
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show auth forms if not logged in
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {authView === 'login' && (
          <LoginForm 
            onToggleRegister={() => setAuthView('register')}
            onToggleForgotPassword={() => setAuthView('forgot')}
          />
        )}
        {authView === 'register' && (
          <RegisterForm onToggleLogin={() => setAuthView('login')} />
        )}
        {authView === 'forgot' && (
          <ForgotPasswordForm onToggleLogin={() => setAuthView('login')} />
        )}
      </div>
    );
  }

  return (
    <>
      <div className="flex h-screen bg-gray-50">
        <Sidebar activeModule={activeModule} onModuleChange={setActiveModule} />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar 
            isOnline={isOnline} 
            pendingOps={pendingOps.length} 
            currentUser={profile?.full_name || profile?.email || 'Usuário'}
            onCommandPalette={() => setCommandPaletteOpen(true)}
          />
          
          <main className="flex-1 overflow-y-auto">
            {activeModule === 'dashboard' && <Dashboard stats={stats} />}
            {activeModule === 'import' && <ImportModule onImport={handleImport} />}
            {activeModule === 'data' && (
              <div className="p-8">
                <h2 className="text-3xl font-bold mb-8">Gestão de Dados</h2>
                <DataTable items={items} onEdit={handleEdit} onDelete={handleDelete} />
              </div>
            )}
            {activeModule === 'classify' && <ClassifyModule items={items} onClassify={handleClassify} />}
            {activeModule === 'duplicates' && <DuplicatesModule items={items} onMerge={handleMerge} />}

            {activeModule === 'rules' && <RulesManager />}
            {activeModule === 'export' && <ExportModule items={items} />}
            {activeModule === 'metrics' && <MetricsModule items={items} auditLog={auditLog} />}
            {activeModule === 'profile' && (
              <div className="p-8 flex justify-center">
                <ProfileManagement />
              </div>
            )}

          </main>
        </div>
        
        <CommandPalette 
          isOpen={commandPaletteOpen} 
          onClose={() => setCommandPaletteOpen(false)}
          onCommand={handleCommand}
        />
        
        <KeyboardShortcuts onShortcut={handleShortcut} />
        
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
      
      <InstallPrompt />
    </>
  );
};

export default AppLayout;
