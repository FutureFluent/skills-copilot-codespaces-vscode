import type { EmissionFactorRecord } from '../types';
import { formatEmissionValue } from '../utils/format';

type EmissionTableProps = {
  records: EmissionFactorRecord[];
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  onClearSelection: () => void;
};

const EmissionTable = ({ records, selectedIds, onSelect, onClearSelection }: EmissionTableProps) => {
  if (records.length === 0) {
    return (
      <article className="table-card">
        <header className="chart-card__header">
          <h2 className="chart-card__title">Emission factor records</h2>
          <p className="chart-card__meta">0 matches</p>
        </header>
        <div className="empty-state">
          <p>No emission factors match the current filters.</p>
          <p className="empty-state__hint">Try broadening your filters or resetting to view the full catalogue.</p>
        </div>
      </article>
    );
  }

  return (
    <article className="table-card">
      <header className="chart-card__header">
        <h2 className="chart-card__title">Emission factor records</h2>
        <p className="chart-card__meta">
          {records.length} results • Click rows to focus charts on specific records
        </p>
      </header>
      {selectedIds.size > 0 && (
        <div className="table-actions">
          <span className="selection-pill">{selectedIds.size} selected</span>
          <button type="button" className="button button--link" onClick={onClearSelection}>
            Clear selection
          </button>
        </div>
      )}
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col">NACE / Activity</th>
              <th scope="col">Country</th>
              <th scope="col">Tier</th>
              <th scope="col">Emission factor</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => {
              const isSelected = selectedIds.has(record.id);
              return (
                <tr
                  key={record.id}
                  className={isSelected ? 'is-selected' : undefined}
                  onClick={() => onSelect(record.id)}
                >
                  <td>{record.category}</td>
                  <td>
                    <div className="table__primary" title={record.naceDescription}>
                      <span className="table__nace">{record.naceCode}</span>
                      <span className="table__description">{record.naceDescription}</span>
                    </div>
                    <div className="table__secondary">{record.scope}</div>
                  </td>
                  <td>
                    <div>{record.country}</div>
                    <div className="table__secondary">{record.region}</div>
                  </td>
                  <td>{record.tier}</td>
                  <td>
                    <span className="table__primary">{formatEmissionValue(record.emissionFactor)}</span>
                    <div className="table__secondary">kg CO₂e / {record.currency}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </article>
  );
};

export default EmissionTable;
