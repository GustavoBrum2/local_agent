import type { Build } from '@/domain/entities/build';

interface Props {
  build: Build;
}

function Value({ label, value }: { label: string; value: string }) {
  return (
    <div className="hardware-row">
      <span>{label}</span>
      <strong>{value || 'Não identificado'}</strong>
    </div>
  );
}

export function HardwareSummary({ build }: Props) {
  return (
    <section className="card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Digital Twin local</p>
          <h2>Configuração atual</h2>
        </div>
      </div>

      <div className="hardware-grid">
        <Value label="CPU" value={build.cpu?.name ?? ''} />
        <Value label="Placa-mãe" value={build.motherboard?.name ?? ''} />
        <Value
          label="RAM"
          value={build.ram.length
            ? build.ram.map((ram) => `${ram.capacityGb} GB ${ram.type} ${ram.speedMhz || ''} MHz`).join(' + ')
            : ''}
        />
        <Value label="GPU" value={build.gpu.map((gpu) => gpu.name).join(' + ')} />
        <Value
          label="Armazenamento"
          value={build.storage.map((disk) => `${disk.name} (${disk.capacityGb} GB)`).join(' + ')}
        />
      </div>
    </section>
  );
}
