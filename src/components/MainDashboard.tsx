import React from 'react';
import { 
  BookOpen, 
  Edit3, 
  Settings, 
  LogOut,
  Mic,
  Play,
  Users,
  TrendingUp
} from 'lucide-react';
import { PageType } from '../App';

interface MainDashboardProps {
  user: any;
  onLogout: () => void;
  onNavigate: (page: PageType) => void;
}

const MainDashboard: React.FC<MainDashboardProps> = ({ user, onLogout, onNavigate }) => {
  const actionCards = [
    {
      id: 'training',
      title: 'Treinar Canal',
      description: 'Analise e replique a estrutura de canais existentes',
      icon: BookOpen,
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600'
    },
    {
      id: 'prompts',
      title: 'Revisar/Editar Conteúdo',
      description: 'Refine e personalize seu conteúdo',
      icon: Edit3,
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600'
    },
    {
      id: 'audio',
      title: 'Gerar Roteiro e Áudio',
      description: 'Crie narrações com vozes de IA',
      icon: Mic,
      color: 'bg-orange-500',
      hoverColor: 'hover:bg-orange-600'
    },
    {
      id: 'settings',
      title: 'Configurações Gerais',
      description: 'Gerencie vozes e APIs do sistema',
      icon: Settings,
      color: 'bg-gray-500',
      hoverColor: 'hover:bg-gray-600'
    }
  ];

  const handleCardClick = (cardId: string) => {
    console.log('Card clicked:', cardId);
    switch (cardId) {
      case 'training':
        console.log('Navigating to training');
        onNavigate('training');
        break;
      case 'prompts':
        console.log('Navigating to prompts');
        onNavigate('prompts');
        break;
      case 'audio':
        console.log('Navigating to generate');
        onNavigate('generate');
        break;
      case 'settings':
        console.log('Navigating to settings');
        onNavigate('settings');
        break;
      default:
        console.log('Unknown card clicked:', cardId);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Header */}
      <div className="bg-black/50 backdrop-blur-xl border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                  <Play className="w-5 h-5 text-black" />
                </div>
                <span className="text-xl font-light text-white">Video AI Studio</span>
              </div>
              
              <nav className="hidden md:flex items-center space-x-6">
                <button className="text-white font-medium">Dashboard</button>
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => onNavigate('settings')}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
              >
                <Settings className="w-5 h-5" />
              </button>
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user.email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="hidden md:block">
                  <div className="text-white text-sm font-medium">{user.email}</div>
                  <div className="text-gray-400 text-xs">Admin</div>
                </div>
              </div>

              <button
                onClick={onLogout}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Welcome Section */}
        <div className="mb-12">
          <h1 className="text-4xl font-light text-white mb-4">
            Bem-vindo, {user.email}
          </h1>
          <p className="text-gray-400 text-lg">
            Escolha uma ação para começar a criar conteúdo automatizado
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {actionCards.map((card) => {
            const IconComponent = card.icon;
            return (
              <button
                key={card.id}
                onClick={() => handleCardClick(card.id)}
                className="group bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 hover:border-gray-700 p-8 transition-all duration-300 transform hover:scale-105 text-left"
              >
                <div className={`w-12 h-12 ${card.color} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <IconComponent className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-medium text-white mb-3 group-hover:text-blue-400 transition-colors">
                  {card.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {card.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Activity */}
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
            <h2 className="text-xl font-medium text-white mb-6">Atividade Recente</h2>
            <div className="space-y-4">
              {[
                { text: 'Prompt de roteiro gerado com sucesso', time: '1 hora atrás' },
                { text: 'Canal treinado com sucesso', time: '2 horas atrás' },
                { text: 'Nova voz adicionada', time: '3 horas atrás' }
              ].map((activity, index) => (
                <div key={index} className="flex items-center justify-between py-3 border-b border-gray-800 last:border-b-0">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-gray-300 text-sm">{activity.text}</span>
                  </div>
                  <span className="text-gray-500 text-xs">{activity.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Statistics */}
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800 p-8">
            <h2 className="text-xl font-medium text-white mb-6">Estatísticas</h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <BookOpen className="w-5 h-5 text-blue-400" />
                  <span className="text-gray-300">Roteiros Criados</span>
                </div>
                <span className="text-2xl font-bold text-white">47</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Users className="w-5 h-5 text-green-400" />
                  <span className="text-gray-300">Canais Treinados</span>
                </div>
                <span className="text-2xl font-bold text-white">12</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                  <span className="text-gray-300">Prompts Gerados</span>
                </div>
                <span className="text-2xl font-bold text-white">156</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainDashboard;
