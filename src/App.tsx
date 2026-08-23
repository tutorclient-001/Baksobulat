import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './client/context/AuthContext.js';
import { ToastProvider, useToast } from './client/context/ToastContext.js';
import { Layout } from './client/components/Layout.js';
import { LoginPage } from './client/pages/LoginPage.js';
import { DashboardPage } from './client/pages/DashboardPage.js';
import { DocumentsPage } from './client/pages/DocumentsPage.js';
import { DocumentDetailPage } from './client/pages/DocumentDetailPage.js';
import { TrashPage } from './client/pages/TrashPage.js';
import { CategoriesPage } from './client/pages/CategoriesPage.js';
import { UsersPage } from './client/pages/UsersPage.js';
import { StatisticsPage } from './client/pages/StatisticsPage.js';
import { SettingsPage } from './client/pages/SettingsPage.js';
import { AuditLogPage } from './client/pages/AuditLogPage.js';

import { DocumentUploadModal } from './client/components/DocumentUploadModal.js';
import { DocumentEditModal } from './client/components/DocumentEditModal.js';
import { LjkEditorModal } from './client/components/LjkEditorModal.js';
import { ExcelExportModal } from './client/components/ExcelExportModal.js';
import { SplitPdfViewer } from './client/components/SplitPdfViewer.js';
import { Modal } from './client/components/Modal.js';
import { Category, DocumentRecord } from './shared/types.js';
import { apiClient } from './client/api/apiClient.js';
import { RefreshCw } from 'lucide-react';

function ProtectedRoute({ children, requireAdmin = false }: { children: React.ReactNode; requireAdmin?: boolean }) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-100 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-xs font-semibold text-zinc-500">Memeriksa autentikasi...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/documents" replace />;
  }

  return <>{children}</>;
}

function MainApp() {
  const { isAuthenticated, isAdmin, canEdit, isLoading } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);

  // Global Interactive Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocumentRecord | null>(null);
  const [ljkDoc, setLjkDoc] = useState<DocumentRecord | null>(null);
  const [excelDoc, setExcelDoc] = useState<DocumentRecord | null>(null);
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);

  const fetchCategories = async () => {
    try {
      const res = await apiClient.get<Category[]>('/categories');
      if (res.success && res.data) {
        setCategories(res.data);
      }
    } catch (e) {
      console.error('Failed to load categories', e);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchCategories();
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-100 dark:bg-zinc-950">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout onOpenUpload={() => setIsUploadOpen(true)}>
                <DashboardPage
                  onOpenUpload={() => setIsUploadOpen(true)}
                  onOpenPreview={(doc) => setPreviewDoc(doc)}
                  onOpenLjk={(doc) => setLjkDoc(doc)}
                />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/documents"
          element={
            <ProtectedRoute>
              <Layout onOpenUpload={() => setIsUploadOpen(true)}>
                <DocumentsPage
                  categories={categories}
                  onOpenUpload={() => setIsUploadOpen(true)}
                  onOpenPreview={(doc) => setPreviewDoc(doc)}
                  onOpenLjk={(doc) => setLjkDoc(doc)}
                  onOpenExcelExport={(doc) => setExcelDoc(doc)}
                  onOpenEdit={(doc) => setEditingDoc(doc)}
                />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/documents/:id"
          element={
            <ProtectedRoute>
              <Layout onOpenUpload={() => setIsUploadOpen(true)}>
                <DocumentDetailPage
                  onOpenLjk={(doc) => setLjkDoc(doc)}
                  onOpenExcelExport={(doc) => setExcelDoc(doc)}
                />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Admin-Only Routes */}
        <Route
          path="/categories"
          element={
            <ProtectedRoute requireAdmin={true}>
              <Layout onOpenUpload={() => setIsUploadOpen(true)}>
                <CategoriesPage onCategoriesUpdated={fetchCategories} />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/trash"
          element={
            <ProtectedRoute requireAdmin={true}>
              <Layout onOpenUpload={() => setIsUploadOpen(true)}>
                <TrashPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/users"
          element={
            <ProtectedRoute requireAdmin={true}>
              <Layout onOpenUpload={() => setIsUploadOpen(true)}>
                <UsersPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/statistics"
          element={
            <ProtectedRoute requireAdmin={true}>
              <Layout onOpenUpload={() => setIsUploadOpen(true)}>
                <StatisticsPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute requireAdmin={true}>
              <Layout onOpenUpload={() => setIsUploadOpen(true)}>
                <SettingsPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/audit-logs"
          element={
            <ProtectedRoute requireAdmin={true}>
              <Layout onOpenUpload={() => setIsUploadOpen(true)}>
                <AuditLogPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
      </Routes>

      {/* Global Interactive Modals */}
      {isUploadOpen && (
        <DocumentUploadModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          categories={categories}
          onSuccess={() => {
            // refresh data
          }}
        />
      )}

      {editingDoc && (
        <DocumentEditModal
          isOpen={!!editingDoc}
          onClose={() => setEditingDoc(null)}
          document={editingDoc}
          categories={categories}
          onSuccess={() => {
            setEditingDoc(null);
          }}
        />
      )}

      {ljkDoc && (
        <LjkEditorModal
          isOpen={!!ljkDoc}
          onClose={() => setLjkDoc(null)}
          document={ljkDoc}
          onSaved={() => {
            // reload
          }}
          onOpenExcelExport={() => {
            const target = ljkDoc;
            setLjkDoc(null);
            setExcelDoc(target);
          }}
        />
      )}

      {excelDoc && (
        <ExcelExportModal
          isOpen={!!excelDoc}
          onClose={() => setExcelDoc(null)}
          document={excelDoc}
        />
      )}

      {previewDoc && (
        <Modal
          isOpen={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
          title={`Pratinjau & Informasi Berkas: ${previewDoc.document_code}`}
          subtitle={previewDoc.title}
          maxWidth="full"
        >
          <SplitPdfViewer
            document={previewDoc}
            onOpenLjkEditor={() => {
              const target = previewDoc;
              setPreviewDoc(null);
              setLjkDoc(target);
            }}
            onOpenExcelExport={() => {
              const target = previewDoc;
              setPreviewDoc(null);
              setExcelDoc(target);
            }}
            onClose={() => setPreviewDoc(null)}
            canEdit={canEdit}
          />
        </Modal>
      )}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <MainApp />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
