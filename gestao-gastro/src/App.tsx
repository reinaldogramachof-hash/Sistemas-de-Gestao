import React from 'react';
import { AppProvider } from './store/AppContext';
import { Layout } from './components/Layout';
import { useNavigation, View } from './hooks/useNavigation';
import { useModules } from './hooks/useModules';
import { AppModule } from './config/modulesConfig';
import { Dashboard } from './components/Dashboard';
import { PDV } from './components/PDV';
import { Stock } from './components/Stock';
import { Cashier } from './components/Cashier';
import { Reports } from './components/Reports';
import { UserManual } from './components/UserManual';
import { Tables } from './components/Tables';
import { Customers } from './components/Customers';
import { Collaborators } from './components/Collaborators';
import { Suppliers } from './components/Suppliers';
import { Products } from './components/Products';
import { Support } from './components/Support';
import { Kitchen } from './components/Kitchen';
import { Settings } from './components/Settings';
import { Security } from './components/Security';
import { ActivationGate } from './components/ActivationGate';
import { EvolutionCenter } from './components/EvolutionCenter';

const AppContent = () => {
  const { currentView, setCurrentView } = useNavigation();
  const { checkAccess } = useModules();

  const renderContent = () => {
    if (!checkAccess(currentView as AppModule)) {
      return (
        <div className="h-full flex flex-col items-center justify-center gap-4 opacity-50">
          <span className="text-5xl">!</span>
          <p className="text-xl font-bold">Modulo nao disponivel no plano atual</p>
          <p className="text-sm">Entre em contato para liberar este recurso.</p>
        </div>
      );
    }

    switch(currentView) {
      case 'dashboard': return <Dashboard />;
      case 'pdv': return <PDV />;
      case 'mesas': return <Tables />;
      case 'cozinha': return <Kitchen />;
      case 'estoque': return <Stock />;
      case 'caixa': return <Cashier />;
      case 'relatorios': return <Reports />;
      case 'manual': return <UserManual />;
      case 'clientes': return <Customers />;
      case 'colaboradores': return <Collaborators />;
      case 'fornecedores': return <Suppliers />;
      case 'produtos': return <Products />;
      case 'suporte': return <Support />;
      case 'configuracoes': return <Settings />;
      case 'seguranca': return <Security />;
      case 'evolucao': return <EvolutionCenter />;
      default: return (
        <div className="h-full flex flex-col items-center justify-center gap-4 opacity-50">
          <span className="text-5xl">...</span>
          <p className="text-xl font-bold">Em construcao</p>
          <p className="text-sm">Este modulo estara disponivel em breve.</p>
        </div>
      );
    }
  }

  return (
    <ActivationGate>
      <Layout currentView={currentView} setCurrentView={setCurrentView}>
         {renderContent()}
      </Layout>
    </ActivationGate>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
