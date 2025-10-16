import type { DashboardFilters } from '../types';

type FilterPanelProps = {
  filters: DashboardFilters;
  categories: string[];
  regions: string[];
  tiers: string[];
  onFilterChange: (key: keyof DashboardFilters, value: string) => void;
  onReset: () => void;
};

const FilterPanel = ({
  filters,
  categories,
  regions,
  tiers,
  onFilterChange,
  onReset
}: FilterPanelProps) => {
  return (
    <section className="filters" aria-label="Dashboard filters">
      <div className="filters__group">
        <label className="filters__field" htmlFor="search">
          <span>Search</span>
          <input
            id="search"
            type="search"
            placeholder="Search by activity, country, or NACE code"
            value={filters.search}
            onChange={(event) => onFilterChange('search', event.target.value)}
          />
        </label>
      </div>
      <div className="filters__group">
        <label className="filters__field" htmlFor="category">
          <span>Category</span>
          <select
            id="category"
            value={filters.category}
            onChange={(event) => onFilterChange('category', event.target.value)}
          >
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label className="filters__field" htmlFor="region">
          <span>Region</span>
          <select
            id="region"
            value={filters.region}
            onChange={(event) => onFilterChange('region', event.target.value)}
          >
            <option value="all">All regions</option>
            {regions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </label>
        <label className="filters__field" htmlFor="tier">
          <span>Confidence tier</span>
          <select
            id="tier"
            value={filters.tier}
            onChange={(event) => onFilterChange('tier', event.target.value)}
          >
            <option value="all">All tiers</option>
            {tiers.map((tier) => (
              <option key={tier} value={tier}>
                {tier}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="filters__actions">
        <button type="button" className="button button--subtle" onClick={onReset}>
          Reset filters
        </button>
      </div>
    </section>
  );
};

export default FilterPanel;
