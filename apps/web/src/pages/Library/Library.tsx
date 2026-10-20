import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuizzes, useDeleteQuiz, useDuplicateQuiz } from '../../hooks/useQuizzes';
import { QuizCard } from '../../components/quiz/QuizCard';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Modal } from '../../components/common/Modal';
import { Layout } from '../../components/Layout';
import { cn } from '../../utils/cn';

export function Library() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importIsZip, setImportIsZip] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading, error, refetch } = useQuizzes({
    search: search || undefined,
    subject: selectedSubject || undefined,
    difficulty: selectedDifficulty ? parseInt(selectedDifficulty) : undefined,
    page,
    pageSize: 12,
  });

  const deleteMutation = useDeleteQuiz();
  const duplicateMutation = useDuplicateQuiz();

  const subjects = [...new Set(data?.quizzes.map(q => q.subject) || [])].sort();
  const difficulties = [1, 2, 3, 4, 5];

  useEffect(() => {
    refetch();
  }, [search, selectedSubject, selectedDifficulty, page]);

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      setQuizToDelete(null);
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Failed to delete quiz:', error);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await duplicateMutation.mutateAsync(id);
    } catch (error) {
      console.error('Failed to duplicate quiz:', error);
    }
  };

  const handleImport = () => {
    if (!importFile) return;
    // This would be handled by useImportQuiz hook
    // For now, just close the modal
    setShowImportModal(false);
    setImportFile(null);
    // In a real implementation:
    // importMutation.mutate({ file: importFile, isZip: importIsZip });
  };

  if (isLoading && page === 1) {
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
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Bibliothèque</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {data?.total || 0} quiz disponibles
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setShowImportModal(true)}>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Importer
            </Button>
            <Button onClick={() => navigate('/quizzes/new/edit')}>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nouveau Quiz
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <Select
              placeholder="Matière"
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value);
                setPage(1);
              }}
              options={subjects.map(s => ({ value: s, label: s }))}
            />
            <Select
              placeholder="Difficulté"
              value={selectedDifficulty}
              onChange={(e) => {
                setSelectedDifficulty(e.target.value);
                setPage(1);
              }}
              options={difficulties.map(d => ({ 
                value: d.toString(), 
                label: ['Facile', 'Moyen', 'Difficile', 'Expert', 'Maître'][d - 1] 
              }))}
            />
            <Button variant="outline" onClick={() => {
              setSearch('');
              setSelectedSubject('');
              setSelectedDifficulty('');
              setPage(1);
            }}>
              Réinitialiser
            </Button>
          </div>
        </div>

        {/* Quiz Grid */}
        {error ? (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">Erreur: {error.message}</p>
            <Button variant="outline" onClick={() => refetch()} className="mt-2">
              Réessayer
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {data?.quizzes.map((quiz) => (
              <QuizCard
                key={quiz.id}
                quiz={quiz}
                onDelete={(id) => {
                  setQuizToDelete(id);
                  setShowDeleteModal(true);
                }}
                onDuplicate={handleDuplicate}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {data && data.total > data.pageSize && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              Précédent
            </Button>
            <span className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
              Page {page} sur {Math.ceil(data.total / data.pageSize)}
            </span>
            <Button
              variant="outline"
              disabled={page * data.pageSize >= data.total}
              onClick={() => setPage(p => p + 1)}
            >
              Suivant
            </Button>
          </div>
        )}

        {/* No results */}
        {data && data.quizzes.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Aucun quiz trouvé
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Essayez de modifier vos filtres ou créez un nouveau quiz.
            </p>
            <Button onClick={() => navigate('/quizzes/new/edit')}>
              Créer un quiz
            </Button>
          </div>
        )}

        {/* Delete Modal */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setQuizToDelete(null);
          }}
          title="Supprimer le quiz"
          footer={
            <>
              <Button variant="outline" onClick={() => {
                setShowDeleteModal(false);
                setQuizToDelete(null);
              }}>
                Annuler
              </Button>
              <Button
                variant="danger"
                onClick={() => quizToDelete && handleDelete(quizToDelete)}
                isLoading={deleteMutation.isPending}
              >
                Supprimer
              </Button>
            </>
          }
        >
          <p className="text-gray-600 dark:text-gray-400">
            Êtes-vous sûr de vouloir supprimer ce quiz ? Cette action ne peut pas être annulée.
          </p>
        </Modal>

        {/* Import Modal */}
        <Modal
          isOpen={showImportModal}
          onClose={() => {
            setShowImportModal(false);
            setImportFile(null);
          }}
          title="Importer un quiz"
          footer={
            <>
              <Button variant="outline" onClick={() => {
                setShowImportModal(false);
                setImportFile(null);
              }}>
                Annuler
              </Button>
              <Button
                onClick={handleImport}
                disabled={!importFile}
              >
                Importer
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Sélectionnez un fichier JSON ou ZIP contenant un quiz.
            </p>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".json,.zip"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setImportFile(e.target.files[0]);
                    // Detect if zip
                    setImportIsZip(e.target.files[0].name.endsWith('.zip'));
                  }
                }}
                className="hidden"
                id="import-file"
              />
              <label htmlFor="import-file" className="cursor-pointer">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-gray-600 dark:text-gray-400">
                  Glisser-déposer ou cliquer pour sélectionner un fichier
                </p>
              </label>
            </div>
            {importFile && (
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Fichier: {importFile.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Type: {importIsZip ? 'ZIP' : 'JSON'}
                </p>
              </div>
            )}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={importIsZip}
                  onChange={(e) => setImportIsZip(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">Fichier ZIP</span>
              </label>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
}
