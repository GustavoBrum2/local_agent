import type { MvpRecommendation, MvpRecommendationCategory } from '@/services/mvp-recommendation-service';

interface Props {
  category: MvpRecommendationCategory;
  recommendations: MvpRecommendation[];
  onCategory: (category: MvpRecommendationCategory) => void;
  onGenerate: () => void;
}

const categories: Array<{ id: MvpRecommendationCategory; label: string }> = [
  { id: 'ram', label: 'Memória RAM' },
  { id: 'ssd', label: 'SSD' },
  { id: 'gpu', label: 'GPU' },
];

export function RecommendationPanel({ category, recommendations, onCategory, onGenerate }: Props) {
  return (
    <section className="card">
      <p className="eyebrow">Engine existente</p>
      <h2>Recomendações compatíveis</h2>
      <p className="muted">
        Esta primeira versão reutiliza a base local e a engine de compatibilidade da extensão.
      </p>

      <div className="category-tabs">
        {categories.map((item) => (
          <button
            key={item.id}
            className={item.id === category ? 'tab active' : 'tab'}
            onClick={() => onCategory(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <button className="primary small" onClick={onGenerate}>Gerar recomendações</button>

      <div className="recommendation-list">
        {recommendations.map(({ part, result }) => (
          <article className="recommendation" key={part.id}>
            <div>
              <strong>{part.name}</strong>
              <p>{result.summary}</p>
            </div>
            <span className={result.status === 'compatible' ? 'badge ok' : 'badge warning'}>
              {result.status === 'compatible' ? 'Compatível' : 'Com ressalvas'}
            </span>
          </article>
        ))}
        {recommendations.length === 0 && (
          <p className="empty">Selecione uma categoria e execute a recomendação.</p>
        )}
      </div>
    </section>
  );
}
