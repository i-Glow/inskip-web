interface ProgressBarProps {
  value: number
  max: number
  label?: string
}

export default function ProgressBar({ value, max, label = 'Progression' }: ProgressBarProps) {
  const pct = max > 0 ? Math.round((100 * value) / max) : 0
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className="h-2 w-full overflow-hidden rounded-full bg-gray-200"
    >
      <div className="h-full bg-indigo-600" style={{ width: `${pct}%` }} />
    </div>
  )
}
