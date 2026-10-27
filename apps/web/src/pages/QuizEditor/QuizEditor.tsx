import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuiz, useCreateQuiz, useUpdateQuiz } from '../../hooks/useQuizzes';
import { useUploadMedia } from '../../hooks/useMedia';
import { QuizJson, Question, MediaContent } from '@qcm/shared';
import { validateQuizJson, generateId } from '@qcm/shared';
import { Layout } from '../../components/Layout';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { CodeEditor } from '../../components/common/CodeEditor';
import { MediaPlayer } from '../../components/common/MediaPlayer';
import { QuestionRenderer } from '../../components/quiz/QuestionRenderer';
import { Modal } from '../../components/common/Modal';
import { ToastContainer, Toast } from '../../components/common/Toast';
import { cn } from '../../utils/cn';

type EditorMode = 'visual' | 'json';

function createEmptyQuestion(): Question {
  return {
    id: generateId('q'),
    prompt: [{ type: 'text', value: '' }],
    options: [
      { id: 'a', content: [{ type: 'text', value: '' }], correct: true },
      { id: 'b', content: [{ type: 'text', value: '' }], correct: false },
    ],
    multiple: false,
    tags: [],
    difficulty: 1,
  };
}

function createEmptyQuizJson(): QuizJson {
  return {
    schemaVersion: 1,
    id: generateId('quiz'),
    title: '',
    subject: '',
    tags: [],
    difficulty: 1,
    questions: [createEmptyQuestion()],
  };
}

export function QuizEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // La route statique "/quizzes/new/edit" ne fournit aucun paramètre à useParams,
  // donc "id" est undefined pour un nouveau quiz.
  const isNew = !id || id === 'new';
  
  const { data: existingQuiz, isLoading } = useQuiz(isNew ? '' : id!);
  const createMutation = useCreateQuiz();
  const updateMutation = useUpdateQuiz();
  const uploadMutation = useUploadMedia();

  const [draft, setDraft] = useState<QuizJson>(createEmptyQuizJson());
  const [mode, setMode] = useState<EditorMode>('visual');
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Initialize from existing quiz or empty
  useEffect(() => {
    if (existingQuiz && !isNew) {
      const stored = existingQuiz.jsonContent as QuizJson | null;
      const parsed = stored && Array.isArray(stored.questions) ? stored : createEmptyQuizJson();
      // Synchroniser les métadonnées de l'enregistrement avec le brouillon
      const merged: QuizJson = {
        ...parsed,
        title: existingQuiz.title || parsed.title,
        subject: existingQuiz.subject || parsed.subject,
        description: existingQuiz.description ?? parsed.description,
        tags: existingQuiz.tags || parsed.tags,
        difficulty: existingQuiz.difficulty ?? parsed.difficulty,
      };
      setDraft(merged);
      setJsonInput(JSON.stringify(merged, null, 2));
    } else {
      const newQuiz = createEmptyQuizJson();
      setDraft(newQuiz);
      setJsonInput(JSON.stringify(newQuiz, null, 2));
    }
  }, [existingQuiz, isNew]);

  // Sync JSON input with draft
  useEffect(() => {
    if (mode === 'json' && jsonError === null) {
      try {
        const parsed = JSON.parse(jsonInput);
        const result = validateQuizJson(parsed);
        if (result.success && result.data) {
          setDraft(result.data as QuizJson);
        }
      } catch {
        // Ignore, will be handled by validation
      }
    }
  }, [jsonInput, mode]);

  // Sync draft to JSON when in visual mode
  useEffect(() => {
    if (mode === 'visual') {
      setJsonInput(JSON.stringify(draft, null, 2));
    }
  }, [draft, mode]);

  const handleUpdateField = useCallback((field: keyof QuizJson, value: any) => {
    setDraft(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleUpdateQuestion = useCallback((index: number, field: keyof Question, value: any) => {
    setDraft(prev => {
      const newQuestions = [...prev.questions];
      newQuestions[index] = { ...newQuestions[index], [field]: value };
      return { ...prev, questions: newQuestions };
    });
  }, []);

  const handleAddQuestion = useCallback(() => {
    setDraft(prev => ({
      ...prev,
      questions: [...prev.questions, createEmptyQuestion()]
    }));
    setActiveQuestionIndex(draft.questions.length);
  }, [draft.questions.length]);

  const handleRemoveQuestion = useCallback((index: number) => {
    setDraft(prev => {
      const newQuestions = [...prev.questions];
      newQuestions.splice(index, 1);
      return { ...prev, questions: newQuestions };
    });
    if (activeQuestionIndex >= draft.questions.length - 1) {
      setActiveQuestionIndex(Math.max(0, draft.questions.length - 2));
    }
  }, [activeQuestionIndex, draft.questions.length]);

  const handleMoveQuestion = useCallback((fromIndex: number, toIndex: number) => {
    setDraft(prev => {
      const newQuestions = [...prev.questions];
      const [removed] = newQuestions.splice(fromIndex, 1);
      newQuestions.splice(toIndex, 0, removed);
      return { ...prev, questions: newQuestions };
    });
    setActiveQuestionIndex(toIndex);
  }, []);

  const handleAddOption = useCallback((questionIndex: number) => {
    setDraft(prev => {
      const newQuestions = [...prev.questions];
      const question = { ...newQuestions[questionIndex] };
      const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      const usedIds = question.options.map(o => o.id);
      const newId = letters.find(l => !usedIds.includes(l)) || String.fromCharCode(letters.length + 97);
      
      question.options.push({
        id: newId,
        content: [{ type: 'text', value: '' }],
        correct: false
      });
      newQuestions[questionIndex] = question;
      return { ...prev, questions: newQuestions };
    });
  }, []);

  const handleRemoveOption = useCallback((questionIndex: number, optionIndex: number) => {
    setDraft(prev => {
      const newQuestions = [...prev.questions];
      const question = { ...newQuestions[questionIndex] };
      question.options.splice(optionIndex, 1);
      newQuestions[questionIndex] = question;
      return { ...prev, questions: newQuestions };
    });
  }, []);

  const handleUpdateOption = useCallback((
    questionIndex: number, 
    optionIndex: number, 
    field: keyof Question['options'][number],
    value: any
  ) => {
    setDraft(prev => {
      const newQuestions = [...prev.questions];
      const question = { ...newQuestions[questionIndex] };
      const option = { ...question.options[optionIndex] };
      (option as Record<string, unknown>)[field] = value;
      question.options[optionIndex] = option;
      newQuestions[questionIndex] = question;
      return { ...prev, questions: newQuestions };
    });
  }, []);

  const handleJsonChange = useCallback((value: string) => {
    setJsonInput(value);
  }, []);

  const handleJsonApply = useCallback(() => {
    try {
      const parsed = JSON.parse(jsonInput);
      const result = validateQuizJson(parsed);
      if (!result.success || !result.data) {
        const message = result.errors.join('; ');
        setJsonError(message);
        setToast({ type: 'error', message: 'JSON invalide: ' + message });
        return;
      }
      setDraft(result.data as QuizJson);
      setJsonError(null);
      setMode('visual');
      setToast({ type: 'success', message: 'JSON appliqué avec succès' });
    } catch (err) {
      if (err instanceof Error) {
        setJsonError(err.message);
        setToast({ type: 'error', message: 'JSON invalide: ' + err.message });
      }
    }
  }, [jsonInput]);

  const handleSave = useCallback(async () => {
    try {
      // Validate
      const result = validateQuizJson(draft);
      if (!result.success || !result.data) {
        setToast({ type: 'error', message: 'Quiz invalide: ' + result.errors.join('; ') });
        return;
      }
      const validQuiz = result.data as QuizJson;
      
      if (isNew) {
        const newQuiz = await createMutation.mutateAsync(validQuiz);
        setToast({ type: 'success', message: 'Quiz créé avec succès' });
        navigate(`/quizzes/${newQuiz.id}/edit`);
      } else {
        await updateMutation.mutateAsync({ id: id!, quiz: validQuiz });
        setToast({ type: 'success', message: 'Quiz mis à jour avec succès' });
      }
    } catch (err) {
      if (err instanceof Error) {
        setToast({ type: 'error', message: 'Erreur: ' + err.message });
      }
    }
  }, [draft, isNew, id, createMutation, updateMutation, navigate]);

  const handleCopyJson = useCallback(() => {
    navigator.clipboard.writeText(JSON.stringify(draft, null, 2));
    setToast({ type: 'success', message: 'JSON copié dans le presse-papiers' });
  }, [draft]);

  const handleDownloadJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${draft.title || 'quiz'}-${draft.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [draft]);

  const handleUploadMedia = useCallback(async (file: File) => {
    try {
      const result = await uploadMutation.mutateAsync({ file, altText: file.name });
      // For now, we'd need to handle the media reference
      // In a full implementation, we'd add it to the question
      setToast({ type: 'success', message: 'Média uploadé avec succès' });
      return result;
    } catch (err) {
      setToast({ type: 'error', message: 'Erreur lors de l\'upload' });
      return null;
    }
  }, [uploadMutation]);

  const activeQuestion = draft.questions[activeQuestionIndex];

  if (isLoading && !isNew) {
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
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {isNew ? 'Nouveau Quiz' : `Modifier: ${draft.title || 'Quiz'}`}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setShowPreview(true)}>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Aperçu
            </Button>
            <Button onClick={handleSave} isLoading={createMutation.isPending || updateMutation.isPending}>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3M12 9v9" />
              </svg>
              Enregistrer
            </Button>
          </div>
        </div>

        {/* Editor Mode Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          <button
            onClick={() => setMode('visual')}
            className={cn(
              'px-4 py-2 text-sm font-medium',
              mode === 'visual' 
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            )}
          >
            Éditeur visuel
          </button>
          <button
            onClick={() => setMode('json')}
            className={cn(
              'px-4 py-2 text-sm font-medium',
              mode === 'json' 
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            )}
          >
            Éditeur JSON
          </button>
        </div>

        {/* Editor Content */}
        {mode === 'visual' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quiz Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Paramètres du Quiz</h3>
              <div className="space-y-4">
                <Input
                  label="Titre"
                  value={draft.title || ''}
                  onChange={(e) => handleUpdateField('title', e.target.value)}
                  placeholder="Titre du quiz"
                />
                <Input
                  label="ID"
                  value={draft.id || ''}
                  onChange={(e) => handleUpdateField('id', e.target.value)}
                  placeholder="ID unique"
                  hint="Laissez vide pour générer automatiquement"
                />
                <Select
                  label="Matière"
                  value={draft.subject || ''}
                  onChange={(e) => handleUpdateField('subject', e.target.value)}
                  options={[
                    { value: 'Anglais', label: 'Anglais' },
                    { value: 'Français', label: 'Français' },
                    { value: 'Mathématiques', label: 'Mathématiques' },
                    { value: 'Histoire', label: 'Histoire' },
                    { value: 'Sciences', label: 'Sciences' },
                    { value: 'Autre', label: 'Autre' },
                  ]}
                  placeholder="Sélectionnez une matière"
                />
                <Select
                  label="Difficulté"
                  value={draft.difficulty?.toString() || ''}
                  onChange={(e) => handleUpdateField('difficulty', parseInt(e.target.value) || undefined)}
                  options={[
                    { value: '1', label: 'Facile' },
                    { value: '2', label: 'Moyen' },
                    { value: '3', label: 'Difficile' },
                    { value: '4', label: 'Expert' },
                    { value: '5', label: 'Maître' },
                  ]}
                  placeholder="Sélectionnez une difficulté"
                />
                <Input
                  label="Tags"
                  value={draft.tags?.join(', ') || ''}
                  onChange={(e) => handleUpdateField('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                  placeholder="Séparés par des virgules"
                />
              </div>
            </div>

            {/* Question Editor */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Questions</h3>
                  <Button size="sm" onClick={handleAddQuestion}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Ajouter
                  </Button>
                </div>

                {/* Question List */}
                <div className="space-y-2 mb-4">
                  {draft.questions.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveQuestionIndex(index)}
                      className={cn(
                        'w-full p-2 rounded-lg text-left text-sm transition-colors',
                        activeQuestionIndex === index 
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span>Question {index + 1}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveQuestion(index);
                            }}
                            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                          >
                            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Active Question Editor */}
                {activeQuestion && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">
                      Question {activeQuestionIndex + 1}
                    </h4>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Énoncé
                        </label>
                        <ContentEditor
                          content={activeQuestion.prompt}
                          onChange={(value) => handleUpdateQuestion(activeQuestionIndex, 'prompt', value)}
                          onUpload={handleUploadMedia}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Type de réponse
                        </label>
                        <Select
                          value={activeQuestion.multiple ? 'multiple' : 'single'}
                          onChange={(e) => handleUpdateQuestion(activeQuestionIndex, 'multiple', e.target.value === 'multiple')}
                          options={[
                            { value: 'single', label: 'Réponse unique' },
                            { value: 'multiple', label: 'Réponses multiples' },
                          ]}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Réponses ({activeQuestion.options.length})
                          </label>
                          <Button size="sm" variant="outline" onClick={() => handleAddOption(activeQuestionIndex)}>
                            Ajouter
                          </Button>
                        </div>

                        {activeQuestion.options.map((option, optIndex) => (
                          <div 
                            key={option.id}
                            className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={option.correct}
                                    onChange={(e) => handleUpdateOption(activeQuestionIndex, optIndex, 'correct', e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 dark:border-gray-600"
                                  />
                                  <span className="text-sm text-gray-600 dark:text-gray-400">Correcte</span>
                                </label>
                              </div>
                              <div className="flex-1">
                                <ContentEditor
                                  content={option.content}
                                  onChange={(value) => handleUpdateOption(activeQuestionIndex, optIndex, 'content', value)}
                                  onUpload={handleUploadMedia}
                                  placeholder="Contenu de la réponse"
                                />
                              </div>
                              <button
                                onClick={() => handleRemoveOption(activeQuestionIndex, optIndex)}
                                className="p-1 text-gray-400 hover:text-red-500"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="Indice"
                          value={activeQuestion.hint || ''}
                          onChange={(e) => handleUpdateQuestion(activeQuestionIndex, 'hint', e.target.value)}
                          placeholder="Indice pour la question"
                        />
                        <Input
                          label="Explication"
                          value={activeQuestion.explanation || ''}
                          onChange={(e) => handleUpdateQuestion(activeQuestionIndex, 'explanation', e.target.value)}
                          placeholder="Explication à afficher après la réponse"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="Tags de la question"
                          value={activeQuestion.tags?.join(', ') || ''}
                          onChange={(e) => handleUpdateQuestion(activeQuestionIndex, 'tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                          placeholder="Séparés par des virgules"
                        />
                        <Select
                          label="Difficulté"
                          value={activeQuestion.difficulty?.toString() || ''}
                          onChange={(e) => handleUpdateQuestion(activeQuestionIndex, 'difficulty', parseInt(e.target.value) || undefined)}
                          options={[
                            { value: '1', label: 'Facile' },
                            { value: '2', label: 'Moyen' },
                            { value: '3', label: 'Difficile' },
                            { value: '4', label: 'Expert' },
                            { value: '5', label: 'Maître' },
                          ]}
                          placeholder="Difficulté de la question"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* JSON Editor */}
        {mode === 'json' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Éditeur JSON</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setJsonInput(JSON.stringify(draft, null, 2))}>
                  Réinitialiser
                </Button>
                <Button size="sm" onClick={handleJsonApply} disabled={!!jsonError}>
                  Appliquer
                </Button>
              </div>
            </div>
            <CodeEditor
              value={jsonInput}
              onChange={handleJsonChange}
              mode="quiz"
              className="min-h-96"
            />
            {jsonError && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{jsonError}</p>
            )}
          </div>
        )}

        {/* JSON Actions */}
        {mode === 'json' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 mt-6">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Actions JSON</h3>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" onClick={handleCopyJson}>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copier JSON
              </Button>
              <Button variant="outline" onClick={handleDownloadJson}>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Télécharger JSON
              </Button>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        <Modal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          title="Aperçu du Quiz"
          size="full"
          footer={
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Fermer
            </Button>
          }
        >
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{draft.title || 'Quiz sans titre'}</h2>
            {draft.subject && (
              <p className="text-gray-600 dark:text-gray-400">
                Matière: {draft.subject} | Difficulté: {['Facile', 'Moyen', 'Difficile', 'Expert', 'Maître'][draft.difficulty! - 1] || 'Non définie'}
              </p>
            )}
            {draft.questions.map((q, index) => (
              <QuestionRenderer
                key={index}
                question={q}
                showCorrect={false}
                showExplanation={false}
              />
            ))}
          </div>
        </Modal>

        {/* Toast */}
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

// Content Editor Component
interface ContentEditorProps {
  content: MediaContent[];
  onChange: (content: MediaContent[]) => void;
  onUpload?: (file: File) => Promise<any>;
  placeholder?: string;
}

function ContentEditor({ content, onChange, onUpload, placeholder }: ContentEditorProps) {
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleAddContent = (type: MediaContent['type']) => {
    const newItem: MediaContent = {
      type,
      ...(type === 'text' ? { value: '' } : { src: '' }),
    };
    onChange([...content, newItem]);
  };

  const handleRemoveContent = (index: number) => {
    const newContent = [...content];
    newContent.splice(index, 1);
    onChange(newContent);
  };

  const handleUpdateContent = (index: number, field: string, value: any) => {
    const newContent = [...content];
    newContent[index] = { ...newContent[index], [field]: value };
    onChange(newContent);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpload) return;

    try {
      setUploadError(null);
      await onUpload(file);
      setShowMediaUpload(false);
    } catch (err) {
      setUploadError('Erreur lors de l\'upload');
    }
  };

  return (
    <div className="space-y-2">
      {content.length === 0 && (
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center text-gray-500 dark:text-gray-400">
          {placeholder || 'Ajoutez du contenu'}
        </div>
      )}

      {content.map((item, index) => (
        <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700">
          {item.type === 'text' ? (
            <textarea
              value={item.value}
              onChange={(e) => handleUpdateContent(index, 'value', e.target.value)}
              placeholder="Texte (Markdown supporté)"
              className="w-full p-2 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
              rows={3}
            />
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 dark:text-gray-400">{item.type}</span>
              {item.src && (
                <div className="flex-1">
                  {item.type === 'image' && (
                    <img 
                      src={item.src} 
                      alt={item.alt || ''}
                      className="max-h-20 rounded"
                    />
                  )}
                  {(item.type === 'audio' || item.type === 'video') && (
                    <MediaPlayer media={item} className="w-full max-h-20" />
                  )}
                </div>
              )}
              {!item.src && (
                <span className="text-gray-400 dark:text-gray-500">Média à sélectionner</span>
              )}
            </div>
          )}

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              {item.type !== 'text' && item.alt && (
                <span className="text-xs text-gray-500 dark:text-gray-400">Alt: {item.alt}</span>
              )}
            </div>
            <button
              onClick={() => handleRemoveContent(index)}
              className="p-1 text-gray-400 hover:text-red-500"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => handleAddContent('text')}>
          + Texte
        </Button>
        <Button size="sm" variant="outline" onClick={() => handleAddContent('image')}>
          + Image
        </Button>
        <Button size="sm" variant="outline" onClick={() => handleAddContent('audio')}>
          + Audio
        </Button>
        <Button size="sm" variant="outline" onClick={() => handleAddContent('video')}>
          + Vidéo
        </Button>
      </div>

      {showMediaUpload && onUpload && (
        <Modal isOpen={showMediaUpload} onClose={() => setShowMediaUpload(false)} title="Upload de média">
          <div className="space-y-4">
            <input
              type="file"
              onChange={handleFileUpload}
              accept="image/*,audio/*,video/*"
            />
            {uploadError && <p className="text-red-500">{uploadError}</p>}
          </div>
        </Modal>
      )}
    </div>
  );
}
