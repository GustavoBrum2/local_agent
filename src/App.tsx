import { useEffect } from 'react';
import { HardwareSummary } from '@/components/HardwareSummary';
import { RecommendationPanel } from '@/components/RecommendationPanel';
import { useDesktopStore } from '@/stores/desktop-store';

export default function App() {
  const {
    twin,
    isLoading,
    isDetecting,
    error,
    recommendationCategory,
    recommendations,
    initialize,
    detect,
    setRecommendationCategory,
    generateRecommendations,
    reset,
  } = useDesktopStore();

  useEffect(() => {
    void initialize();
  }, [initialize]);

  if (isLoading) {
    return <main className="center-screen">Carregando Agente Local...</main>;
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Agente Local</p>
          <h1>Seu computador, entendido como um produto contínuo.</h1>
        </div>

        <div className="hero-actions">
          <button className="primary" disabled={isDetecting} onClick={() => void detect()}>
            {isDetecting ? 'Detectando...' : twin ? 'Analisar novamente' : 'Analisar este computador'}
          </button>
          {twin && (
            <button className="secondary" onClick={() => void reset()}>Apagar Digital Twin local</button>
          )}
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      {!twin ? (
        <section className="empty-state card">
          <h2>Nenhuma máquina cadastrada</h2>
          <p>
            Execute a primeira análise. O aplicativo chamará o coletor PowerShell via Tauri,
            normalizará os dados usando a lógica da extensão e criará o Digital Twin local.
          </p>
        </section>
      ) : (
        <>
          <section className="twin-meta card compact">
            <div>
              <p className="eyebrow">Máquina</p>
              <h2>{twin.name}</h2>
            </div>
            <div className="meta-values">
              <span>ID local: {twin.machineId.slice(0, 8)}...</span>
              <span>Última análise: {new Date(twin.updatedAt).toLocaleString('pt-BR')}</span>
              <span>Snapshots anteriores: {twin.history.length}</span>
            </div>
          </section>

          <div className="content-grid">
            <HardwareSummary build={twin.current.build} />
            <RecommendationPanel
              category={recommendationCategory}
              recommendations={recommendations}
              onCategory={setRecommendationCategory}
              onGenerate={generateRecommendations}
            />
          </div>
        </>
      )}
    </main>
  );
}
