import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateBackup, useRestoreBackup } from '../../hooks/useBackup';
import { Layout } from '../../components/Layout';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { ToastContainer, Toast } from '../../components/common/Toast';
import { cn } from '../../utils/cn';

export function Backup() {
  const navigate = useNavigate();
  const createMutation = useCreateBackup();
  const restoreMutation = useRestoreBackup();
  
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateBackup = useCallback(async () => {
    try {
      const response = await createMutation.mutateAsync();
      setLastBackupDate(response.createdAt);
      setToast({ type: 'success', message: 'Sauvegarde créée avec succès' });
      setShowBackupModal(false);
    } catch (error) {
      setToast({ type: 'error', message: 'Erreur lors de la création de la sauvegarde' });
    }
  }, [createMutation]);

  const handleDownloadBackup = useCallback(async () => {
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        // In a real implementation, we'd call the download function
        // For now, we'll simulate it
        const dummyBlob = new Blob(['{"test": "backup"}'], { type: 'application/zip' });
        resolve(dummyBlob);
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setToast({ type: 'success', message: 'Sauvegarde téléchargée' });
    } catch (error) {
      setToast({ type: 'error', message: 'Erreur lors du téléchargement' });
    }
  }, []);

  const handleUploadBackup = useCallback(async () => {
    if (!backupFile) return;
    
    try {
      await restoreMutation.mutateAsync(backupFile);
      setToast({ type: 'success', message: 'Sauvegarde restaurée avec succès' });
      setShowRestoreModal(false);
      setBackupFile(null);
      
      // Refresh data
      window.location.reload();
    } catch (error) {
      setToast({ type: 'error', message: 'Erreur lors de la restauration' });
    }
  }, [backupFile, restoreMutation]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setBackupFile(e.target.files[0]);
    }
  }, []);

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Sauvegarde</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          Gérez vos sauvegardes et restaurations
        </p>

        {/* Backup Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Créer une sauvegarde
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Créez une sauvegarde complète de toutes vos données (quiz, questions, statistiques, etc.)
            au format ZIP.
          </p>
          
          <div className="flex items-center gap-3">
            <Button onClick={() => setShowBackupModal(true)}>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Créer une sauvegarde
            </Button>
            
            <Button variant="outline" onClick={handleDownloadBackup} disabled={!lastBackupDate}>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Télécharger la dernière sauvegarde
            </Button>
          </div>
          
          {lastBackupDate && (
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              Dernière sauvegarde: {new Date(lastBackupDate).toLocaleString('fr-FR')}
            </p>
          )}
        </div>

        {/* Restore Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Restaurer une sauvegarde
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Restaurez vos données à partir d'une sauvegarde ZIP. Attention, cette action écrasera
            toutes vos données actuelles.
          </p>
          
          <Button variant="outline" onClick={() => setShowRestoreModal(true)}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            Restaurer une sauvegarde
          </Button>
        </div>

        {/* Information */}
        <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                Important
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                La restauration d'une sauvegarde écrasera toutes vos données actuelles.
                Pensez à créer une sauvegarde avant de restaurer.
              </p>
            </div>
          </div>
        </div>

        {/* Create Backup Modal */}
        <Modal
          isOpen={showBackupModal}
          onClose={() => setShowBackupModal(false)}
          title="Créer une sauvegarde"
          footer={
            <>
              <Button variant="outline" onClick={() => setShowBackupModal(false)}>
                Annuler
              </Button>
              <Button 
                onClick={handleCreateBackup}
                isLoading={createMutation.isPending}
              >
                Créer la sauvegarde
              </Button>
            </>
          }
        >
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Vous allez créer une sauvegarde complète de toutes vos données.
            Cette opération peut prendre quelques secondes selon la taille de vos données.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            La sauvegarde inclut :
          </p>
          <ul className="list-disc list-inside text-sm text-gray-500 dark:text-gray-400 mt-2">
            <li>Tous vos quiz et questions</li>
            <li>Toutes vos réponses et statistiques</li>
            <li>Vos paramètres et préférences</li>
            <li>Vos fichiers médias</li>
          </ul>
        </Modal>

        {/* Restore Backup Modal */}
        <Modal
          isOpen={showRestoreModal}
          onClose={() => {
            setShowRestoreModal(false);
            setBackupFile(null);
          }}
          title="Restaurer une sauvegarde"
          size="lg"
          footer={
            <>
              <Button variant="outline" onClick={() => {
                setShowRestoreModal(false);
                setBackupFile(null);
              }}>
                Annuler
              </Button>
              <Button 
                onClick={handleUploadBackup}
                disabled={!backupFile}
                isLoading={restoreMutation.isPending}
              >
                Restaurer
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Sélectionnez un fichier ZIP de sauvegarde à restaurer.
            </p>
            
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".zip"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer"
              >
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-gray-600 dark:text-gray-400">
                  Glisser-déposer ou cliquer pour sélectionner un fichier ZIP
                </p>
              </button>
            </div>
            
            {backupFile && (
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{backupFile.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatFileSize(backupFile.size)}
                    </p>
                  </div>
                  <Button 
                    variant="danger" 
                    size="sm"
                    onClick={() => {
                      setBackupFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    Supprimer
                  </Button>
                </div>
              </div>
            )}
            
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg p-3">
              <p className="text-sm text-red-800 dark:text-red-200">
                ⚠️ Attention: La restauration écrasera toutes vos données actuelles.
                Cette action ne peut pas être annulée.
              </p>
            </div>
          </div>
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

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Ko';
  const k = 1024;
  const sizes = ['Ko', 'Mo', 'Go'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
