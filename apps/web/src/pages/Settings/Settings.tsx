import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSettings, useUpdateSettings } from '../../hooks/useSettings';
import { UserSettings } from '@qcm/shared';
import { Layout } from '../../components/Layout';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Modal } from '../../components/common/Modal';
import { ToastContainer, Toast } from '../../components/common/Toast';
import { cn } from '../../utils/cn';

export function Settings() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { data: settings, isLoading } = useSettings();
  const updateMutation = useUpdateSettings();
  
  const [formData, setFormData] = useState<UserSettings>({
    dailyGoal: 20,
    theme: 'system',
    notifications: true,
    playSound: true,
    maxMediaSize: {
      image: 5,
      audio: 20,
      video: 100
    }
  });
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleChange = (field: keyof UserSettings, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleMaxMediaChange = (type: keyof UserSettings['maxMediaSize'], value: number) => {
    setFormData(prev => ({
      ...prev,
      maxMediaSize: {
        ...prev.maxMediaSize,
        [type]: value
      }
    }));
  };

  const handleSubmit = async () => {
    try {
      await updateMutation.mutateAsync(formData);
      setToast({ type: 'success', message: 'Paramètres mis à jour avec succès' });
    } catch (error) {
      setToast({ type: 'error', message: 'Erreur lors de la mise à jour' });
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">Paramètres</h1>

        {/* User Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Compte</h2>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">Utilisateur</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Gérer votre profil</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" onClick={() => setShowLogoutModal(true)}>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Se déconnecter
            </Button>
          </div>
        </div>

        {/* Appearance Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Apparence</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Thème
              </label>
              <Select
                value={formData.theme || 'system'}
                onChange={(e) => handleChange('theme', e.target.value as 'light' | 'dark' | 'system')}
                options={[
                  { value: 'system', label: 'Système' },
                  { value: 'light', label: 'Clair' },
                  { value: 'dark', label: 'Sombre' }
                ]}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Suivre les paramètres du système ou choisir manuellement
              </p>
            </div>
          </div>
        </div>

        {/* Learning Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Apprentissage</h2>
          
          <div className="space-y-4">
            <Input
              label="Objectif quotidien"
              type="number"
              value={formData.dailyGoal || 20}
              onChange={(e) => handleChange('dailyGoal', parseInt(e.target.value) || 0)}
              placeholder="Nombre de questions par jour"
              hint="Nombre de questions à réviser chaque jour"
            />
            
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notifications
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Recevoir des rappels pour les révisions
                </p>
              </div>
              <button
                type="button"
                className={cn(
                  'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                  formData.notifications ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                )}
                onClick={() => handleChange('notifications', !formData.notifications)}
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                    formData.notifications ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Sons
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Jouer des sons pour les réponses
                </p>
              </div>
              <button
                type="button"
                className={cn(
                  'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                  formData.playSound ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                )}
                onClick={() => handleChange('playSound', !formData.playSound)}
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                    formData.playSound ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Media Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Médias</h2>
          
          <div className="space-y-4">
            <Input
              label="Taille max images (Mo)"
              type="number"
              value={formData.maxMediaSize?.image || 5}
              onChange={(e) => handleMaxMediaChange('image', parseInt(e.target.value) || 5)}
              placeholder="Taille en Mo"
            />
            <Input
              label="Taille max audio (Mo)"
              type="number"
              value={formData.maxMediaSize?.audio || 20}
              onChange={(e) => handleMaxMediaChange('audio', parseInt(e.target.value) || 20)}
              placeholder="Taille en Mo"
            />
            <Input
              label="Taille max vidéo (Mo)"
              type="number"
              value={formData.maxMediaSize?.video || 100}
              onChange={(e) => handleMaxMediaChange('video', parseInt(e.target.value) || 100)}
              placeholder="Taille en Mo"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Actions</h2>
          <div className="space-y-3">
            <Button onClick={handleSubmit} isLoading={updateMutation.isPending}>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3M12 9v9" />
              </svg>
              Enregistrer les paramètres
            </Button>
            
            <Button variant="outline" onClick={() => navigate('/backup')}>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Sauvegarde et restauration
            </Button>
          </div>
        </div>

        {/* Logout Modal */}
        <Modal
          isOpen={showLogoutModal}
          onClose={() => setShowLogoutModal(false)}
          title="Se déconnecter"
          footer={
            <>
              <Button variant="outline" onClick={() => setShowLogoutModal(false)}>
                Annuler
              </Button>
              <Button variant="danger" onClick={handleLogout}>
                Se déconnecter
              </Button>
            </>
          }
        >
          <p className="text-gray-600 dark:text-gray-400">
            Êtes-vous sûr de vouloir vous déconnecter ?
          </p>
        </Modal>

        <ToastContainer position="top-right">
          {toast && (
            <Toast
              type={toast.type}
              message={toast.message}
              onDismiss={() => setToast(null)}
            />
          )}
        </ToastContainer>
      </div>
    </Layout>
  );
}

// Switch Component
import { forwardRef, InputHTMLAttributes } from 'react';

interface SwitchProps extends InputHTMLAttributes<HTMLInputElement> {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const Switch = forwardRef<HTMLInputElement, SwitchProps>(({ 
  checked, 
  onChange, 
  className,
  ...props 
}, ref) => {
  return (
    <button
      type="button"
      className={cn(
        'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700',
        className
      )}
      onClick={() => onChange(!checked)}
      {...props}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  );
});

Switch.displayName = 'Switch';
