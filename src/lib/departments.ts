export const DEPARTMENTS = [
  { label: 'Design', value: 'design' },
  { label: 'Engage', value: 'engage' },
  { label: 'Plus', value: 'plus' },
  { label: 'Advise', value: 'advise' },
] as const

export type Department = (typeof DEPARTMENTS)[number]['value']

export const departmentLabel = (value?: string | null) =>
  DEPARTMENTS.find((department) => department.value === value)?.label ?? value

// Distinct, accessible color per department so the badge doubles as a visual indicator.
export const DEPARTMENT_BADGE_STYLES: Record<Department, string> = {
  design:
    'border-violet-200 bg-violet-100 text-violet-700 dark:border-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
  engage:
    'border-sky-200 bg-sky-100 text-sky-700 dark:border-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
  plus: 'border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  advise:
    'border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
}
