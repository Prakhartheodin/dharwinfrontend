import type { StylesConfig, GroupBase } from 'react-select';

/**
 * react-select styles tuned to the ATS Preline look: 8px radius, defaultborder,
 * primary focus ring. Generic over option type so both selects can reuse it.
 */
export function atsSelectStyles<
  Option,
  IsMulti extends boolean = false
>(): StylesConfig<Option, IsMulti, GroupBase<Option>> {
  return {
    control: (base, state) => ({
      ...base,
      minHeight: '38px',
      borderRadius: '0.5rem',
      borderColor: state.isFocused ? 'rgb(var(--primary))' : 'rgb(var(--input-border, 217 217 217))',
      boxShadow: state.isFocused ? '0 0 0 2px rgb(var(--primary) / 0.2)' : 'none',
      fontSize: '0.875rem',
      ':hover': { borderColor: 'rgb(var(--primary) / 0.5)' },
    }),
    menu: (base) => ({ ...base, zIndex: 200, fontSize: '0.875rem' }),
    menuPortal: (base) => ({ ...base, zIndex: 200 }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected
        ? 'rgb(var(--primary))'
        : state.isFocused
          ? 'rgb(var(--primary) / 0.08)'
          : 'transparent',
      color: state.isSelected ? '#fff' : 'inherit',
    }),
    multiValue: (base) => ({
      ...base,
      borderRadius: '0.375rem',
      backgroundColor: 'rgb(var(--primary) / 0.08)',
    }),
  };
}
